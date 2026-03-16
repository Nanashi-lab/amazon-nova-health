"""Voice WebSocket endpoint and health check for Nova 2 Sonic integration.

Provides:
- WebSocket at /api/voice for bidirectional audio relay via BidiAgent
- GET /api/voice/health to check Nova Sonic availability

Session model: phone-call style. User clicks mic to start, speaks naturally,
agent responds in real-time with audio. Multi-turn within one session.
User clicks End to close.
"""

import asyncio
import logging

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from strands.experimental.bidi import (
    BidiAudioStreamEvent,
    BidiTranscriptStreamEvent,
    BidiResponseCompleteEvent,
    BidiConnectionCloseEvent,
    BidiErrorEvent,
    ToolUseStreamEvent,
)
from strands.experimental.bidi.models.nova_sonic import BidiNovaSonicModel

from backend.agents.bidi_agent import create_voice_agent
from backend.services.auth import JWT_SECRET, JWT_ALGORITHM

logger = logging.getLogger(__name__)

router = APIRouter()


def _validate_ws_token(token: str | None) -> bool:
    """Validate JWT token from WebSocket query parameter."""
    if not token:
        return False
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub") is not None
    except (jwt.ExpiredSignatureError, jwt.PyJWTError):
        return False


@router.websocket("/api/voice")
async def voice_ws(websocket: WebSocket):
    """Bidirectional audio relay between browser and Nova 2 Sonic via BidiAgent.

    Phone-call model: session stays open for multi-turn conversation.
    User sends audio continuously, agent responds with audio in real-time.
    Session ends when user sends {"type": "end_session"} or disconnects.
    """
    token = websocket.query_params.get("token")
    if not _validate_ws_token(token):
        await websocket.accept()
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()

    agent = create_voice_agent()
    session_ending = asyncio.Event()

    try:
        await agent.start()

        async def relay_input():
            """Forward browser audio to BidiAgent until session ends."""
            try:
                while not session_ending.is_set():
                    data = await websocket.receive_json()
                    if data.get("type") == "audio":
                        await agent.send({
                            "type": "bidi_audio_input",
                            "audio": data["audio"],
                            "format": "pcm",
                            "sample_rate": 16000,
                            "channels": 1,
                        })
                    elif data.get("type") == "end_session":
                        session_ending.set()
                        break
            except WebSocketDisconnect:
                session_ending.set()

        async def relay_output():
            """Forward BidiAgent events to browser."""
            try:
                async for event in agent.receive():
                    if session_ending.is_set():
                        break

                    if isinstance(event, BidiAudioStreamEvent):
                        await websocket.send_json({
                            "type": "audio",
                            "audio": event.audio,
                        })
                    elif isinstance(event, BidiTranscriptStreamEvent):
                        await websocket.send_json({
                            "type": "transcript",
                            "text": event.text,
                            "role": event.role,
                            "isFinal": event.is_final,
                        })
                    elif isinstance(event, BidiResponseCompleteEvent):
                        await websocket.send_json({
                            "type": "response_complete",
                        })
                        # Don't break — multi-turn: keep listening for next turn
                    elif isinstance(event, ToolUseStreamEvent):
                        tool = event["current_tool_use"]
                        await websocket.send_json({
                            "type": "tool_start",
                            "name": tool["name"],
                            "toolUseId": tool["toolUseId"],
                        })
                    elif isinstance(event, BidiConnectionCloseEvent):
                        # Server-side session end (timeout, stop_conversation tool, etc.)
                        await websocket.send_json({
                            "type": "session_end",
                            "reason": str(getattr(event, 'reason', 'closed')),
                        })
                        session_ending.set()
                        break
                    elif isinstance(event, BidiErrorEvent):
                        await websocket.send_json({
                            "type": "error",
                            "message": str(event),
                        })
            except WebSocketDisconnect:
                session_ending.set()

        # Run both relays as tasks so we can cancel output when input ends
        input_task = asyncio.create_task(relay_input())
        output_task = asyncio.create_task(relay_output())

        # Wait for EITHER task to signal session end
        done, pending = await asyncio.wait(
            [input_task, output_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        session_ending.set()

        # Cancel remaining tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("Voice WebSocket error: %s", e)
    finally:
        # Graceful shutdown — suppress AWS CRT cleanup errors
        try:
            await asyncio.wait_for(agent.stop(), timeout=3.0)
        except (asyncio.TimeoutError, Exception):
            pass


@router.get("/api/voice/health")
async def voice_health():
    """Check whether Nova 2 Sonic is reachable.

    No auth required -- read-only health check.
    """
    from backend.config import AWS_REGION

    try:
        model = BidiNovaSonicModel(
            model_id="amazon.nova-2-sonic-v1:0",
            client_config={"region": AWS_REGION},
        )
        await model.start()
        await model.stop()
        return {"available": True}
    except Exception:
        return {"available": False, "error": "Nova Sonic unavailable"}

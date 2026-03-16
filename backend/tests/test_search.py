"""Search service tests -- simple ILIKE search across patient fields."""

import pytest

from backend.models.patient import Patient
from backend.services.search import simple_search


def test_simple_search(test_db):
    """SRCH-02: Simple DB-filter search across patient fields."""
    p1 = Patient(
        id="P001", name="Margaret Chen", age=72, gender="F",
        room="101", status="critical", condition="Post-cardiac surgery",
        admitted_date="2026-03-10",
        vitals={"heartRate": 92, "bloodPressure": "135/85", "oxygenSat": 94, "temperature": 99.1},
        allergies=["Penicillin"], attending_physician="Dr. Williams",
    )
    p2 = Patient(
        id="P002", name="James Wilson", age=45, gender="M",
        room="202", status="stable", condition="Appendectomy",
        admitted_date="2026-03-12",
        vitals={"heartRate": 72, "bloodPressure": "120/80", "oxygenSat": 98, "temperature": 98.6},
        allergies=[], attending_physician="Dr. Smith",
    )
    test_db.add(p1)
    test_db.add(p2)
    test_db.commit()

    # Search by name
    results = simple_search(test_db, "Margaret")
    assert len(results) >= 1
    assert results[0]["title"] == "Margaret Chen"
    assert results[0]["type"] == "patient"

    # Search by room
    results = simple_search(test_db, "202")
    assert len(results) >= 1
    assert any(r["title"] == "James Wilson" for r in results)

    # Search with no match
    results = simple_search(test_db, "zzzznonexistent")
    assert len(results) == 0

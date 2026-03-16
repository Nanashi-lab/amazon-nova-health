import { useState, useCallback } from 'react';
import { Patient } from '@/lib/types';

export interface MedEntry {
  name: string;
  dosage: string;
  frequency: string;
}

const EMPTY_MED: MedEntry = { name: '', dosage: '', frequency: '' };

export type PatientStatus = 'stable' | 'monitoring' | 'caution' | 'critical';

export interface PatientFormState {
  name: string;
  age: string;
  gender: 'M' | 'F';
  room: string;
  condition: string;
  physician: string;
  status: PatientStatus;
  medications: MedEntry[];
  allergyInput: string;
  allergies: string[];
  isDone: boolean;
}

export interface PatientFormActions {
  setName: (v: string) => void;
  setAge: (v: string) => void;
  setGender: (v: 'M' | 'F') => void;
  setRoom: (v: string) => void;
  setCondition: (v: string) => void;
  setPhysician: (v: string) => void;
  setStatus: (v: PatientStatus) => void;
  setAllergyInput: (v: string) => void;
  setIsDone: (v: boolean) => void;
  addMedication: () => void;
  updateMedication: (idx: number, field: keyof MedEntry, value: string) => void;
  removeMedication: (idx: number) => void;
  addAllergy: () => void;
  removeAllergy: (allergy: string) => void;
  handleAllergyKeyDown: (e: React.KeyboardEvent) => void;
  resetForm: () => void;
  populateFromPatient: (patient: Patient) => void;
  getValidMeds: () => Array<{ name: string; dosage: string; frequency: string; lastAdministered: string }>;
}

export interface UsePatientFormReturn {
  state: PatientFormState;
  actions: PatientFormActions;
  canSubmit: boolean;
}

export function usePatientForm(): UsePatientFormReturn {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('F');
  const [room, setRoom] = useState('');
  const [condition, setCondition] = useState('');
  const [physician, setPhysician] = useState('');
  const [status, setStatus] = useState<PatientStatus>('stable');
  const [medications, setMedications] = useState<MedEntry[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setAge('');
    setGender('F');
    setRoom('');
    setCondition('');
    setPhysician('');
    setStatus('stable');
    setMedications([]);
    setAllergyInput('');
    setAllergies([]);
    setIsDone(false);
  }, []);

  const populateFromPatient = useCallback((patient: Patient) => {
    setName(patient.name);
    setAge(String(patient.age));
    setGender(patient.gender);
    setRoom(patient.room);
    setCondition(patient.condition);
    setPhysician(patient.attendingPhysician);
    setStatus(patient.status);
    setMedications(
      patient.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
      }))
    );
    setAllergyInput('');
    setAllergies([...patient.allergies]);
    setIsDone(false);
  }, []);

  const addMedication = useCallback(() => {
    setMedications((prev) => [...prev, { ...EMPTY_MED }]);
  }, []);

  const updateMedication = useCallback((idx: number, field: keyof MedEntry, value: string) => {
    setMedications((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  }, []);

  const removeMedication = useCallback((idx: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addAllergy = useCallback(() => {
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies((prev) => [...prev, trimmed]);
      setAllergyInput('');
    }
  }, [allergyInput, allergies]);

  const removeAllergy = useCallback((allergy: string) => {
    setAllergies((prev) => prev.filter((a) => a !== allergy));
  }, []);

  const handleAllergyKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAllergy();
    }
  }, [addAllergy]);

  const getValidMeds = useCallback(() => {
    const now = new Date().toISOString();
    return medications
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name,
        dosage: m.dosage || 'TBD',
        frequency: m.frequency || 'TBD',
        lastAdministered: now,
      }));
  }, [medications]);

  const canSubmit = !!(name.trim() && age.trim() && room.trim() && condition.trim() && physician.trim());

  return {
    state: {
      name,
      age,
      gender,
      room,
      condition,
      physician,
      status,
      medications,
      allergyInput,
      allergies,
      isDone,
    },
    actions: {
      setName,
      setAge,
      setGender,
      setRoom,
      setCondition,
      setPhysician,
      setStatus,
      setAllergyInput,
      setIsDone,
      addMedication,
      updateMedication,
      removeMedication,
      addAllergy,
      removeAllergy,
      handleAllergyKeyDown,
      resetForm,
      populateFromPatient,
      getValidMeds,
    },
    canSubmit,
  };
}

import { Patient } from '@/lib/types';

export const statusLabels: Record<Patient['status'], string> = {
  critical: 'Critical',
  caution: 'Caution',
  stable: 'Stable',
  monitoring: 'Monitoring',
};

export const STATUS_ORDER: Record<Patient['status'], number> = {
  critical: 0,
  caution: 1,
  monitoring: 2,
  stable: 3,
};

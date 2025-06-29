import { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useEnvironment } from '../contexts/EnvironmentContext';

interface EnvironmentSelectorProps {
  value?: string;
  onChange: (environmentId: string) => void;
  size?: 'small' | 'medium';
}

export default function EnvironmentSelector({ value, onChange, size = 'medium' }: EnvironmentSelectorProps) {
  const { environments } = useEnvironment();
  const [selectedEnv, setSelectedEnv] = useState<string>('');

  useEffect(() => {
    if (value) {
      setSelectedEnv(value);
    } else if (environments.length > 0 && !selectedEnv) {
      // Select default environment
      const defaultEnv = environments.find(e => e.isDefault) || environments[0];
      setSelectedEnv(defaultEnv.id);
      onChange(defaultEnv.id);
    }
  }, [value, environments, selectedEnv, onChange]);

  const handleChange = (event: SelectChangeEvent) => {
    const envId = event.target.value;
    setSelectedEnv(envId);
    onChange(envId);
  };

  return (
    <FormControl size={size} sx={{ minWidth: 150 }}>
      <InputLabel>Environment</InputLabel>
      <Select
        value={selectedEnv}
        label="Environment"
        onChange={handleChange}
      >
        {environments.map((env) => (
          <MenuItem key={env.id} value={env.id}>
            {env.name}
            {env.isDefault && ' (Default)'}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { Environment } from '../../../shared/src/types';
import { api } from '../services/api';

interface EnvironmentSelectorProps {
  value?: string;
  onChange: (environmentId: string) => void;
  size?: 'small' | 'medium';
}

export default function EnvironmentSelector({ value, onChange, size = 'medium' }: EnvironmentSelectorProps) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string>('');

  useEffect(() => {
    loadEnvironments();
  }, []);

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

  const loadEnvironments = async () => {
    try {
      const data = await api.getEnvironments();
      setEnvironments(data);
    } catch (error) {
      console.error('Failed to load environments:', error);
    }
  };

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
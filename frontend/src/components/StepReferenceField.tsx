import React, { useState, useRef, useEffect } from 'react';
import { 
  TextField, 
  Autocomplete, 
  Paper, 
  Popper, 
  createFilterOptions,
  TextFieldProps 
} from '@mui/material';
import { TestStep } from '../../../shared/src/types';
import { GENERATOR_FUNCTIONS } from '../utils/randomGenerators';

interface StepReferenceFieldProps extends Omit<TextFieldProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  availableSteps: TestStep[];
}

const filter = createFilterOptions<string>({
  matchFrom: 'start',
  limit: 10,
});

export default function StepReferenceField({ 
  value, 
  onChange, 
  availableSteps, 
  ...textFieldProps 
}: StepReferenceFieldProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [wordStart, setWordStart] = useState(0);
  const [autocompleteType, setAutocompleteType] = useState<'step' | 'random' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate step reference options
  const stepOptions = availableSteps.map(step => ({
    id: step.id,
    name: step.name,
    reference: `$${step.id}`,
    label: `$${step.id} - ${step.name}`,
    type: 'step' as const,
  }));

  // Generate random generator options
  const randomOptions = Object.entries(GENERATOR_FUNCTIONS).map(([key, generator]) => ({
    id: key,
    name: generator.name,
    reference: generator.example,
    label: `${generator.syntax} - ${generator.description}`,
    type: 'random' as const,
  }));

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    const position = event.target.selectionStart || 0;
    
    setInputValue(newValue);
    setCursorPosition(position);
    onChange(newValue);

    // Check if we're typing a step reference or random generator
    const beforeCursor = newValue.substring(0, position);
    const lastDollarIndex = beforeCursor.lastIndexOf('$');
    
    if (lastDollarIndex !== -1) {
      // Check if there's a space or other delimiter after the $
      const afterDollar = beforeCursor.substring(lastDollarIndex + 1);
      const hasSpace = afterDollar.includes(' ') || afterDollar.includes('\n');
      
      if (!hasSpace) {
        // Check if it's a random generator pattern
        if (afterDollar.startsWith('random.')) {
          // We're typing a random generator
          const randomPart = afterDollar.substring(7); // After "random."
          setCurrentWord(randomPart);
          setWordStart(lastDollarIndex + 8); // +8 for "$random."
          setAutocompleteType('random');
          setOpen(true);
        } else if (afterDollar.includes('random')) {
          // User is typing "random" - show random options
          setCurrentWord(afterDollar);
          setWordStart(lastDollarIndex + 1);
          setAutocompleteType('random');
          setOpen(true);
        } else {
          // We're typing a step reference
          setCurrentWord(afterDollar);
          setWordStart(lastDollarIndex + 1);
          setAutocompleteType('step');
          setOpen(true);
        }
      } else {
        setOpen(false);
        setAutocompleteType(null);
      }
    } else {
      setOpen(false);
      setAutocompleteType(null);
    }
  };

  const handleAutocompleteChange = (_: any, newValue: any) => {
    if (newValue && typeof newValue === 'object') {
      // Replace the current word with the selected step reference
      const before = inputValue.substring(0, wordStart - 1); // -1 to include the $
      const after = inputValue.substring(cursorPosition);
      const newText = before + newValue.reference + after;
      
      setInputValue(newText);
      onChange(newText);
      setOpen(false);
      
      // Set cursor position after the inserted reference
      setTimeout(() => {
        if (inputRef.current) {
          const newPosition = before.length + newValue.reference.length;
          inputRef.current.setSelectionRange(newPosition, newPosition);
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const getFilteredOptions = () => {
    if (autocompleteType === 'random') {
      // If user typed "random", show all random options
      if (currentWord === 'random' || currentWord.startsWith('random')) {
        return randomOptions;
      }
      // Otherwise filter by function name
      return randomOptions.filter(option => 
        option.id.toLowerCase().includes(currentWord.toLowerCase()) ||
        option.name.toLowerCase().includes(currentWord.toLowerCase())
      );
    } else if (autocompleteType === 'step') {
      return stepOptions.filter(option => 
        option.id.toLowerCase().includes(currentWord.toLowerCase()) ||
        option.name.toLowerCase().includes(currentWord.toLowerCase())
      );
    }
    return [];
  };

  const filteredOptions = getFilteredOptions();

  return (
    <Autocomplete
      open={open}
      onOpen={() => {}}
      onClose={() => setOpen(false)}
      options={filteredOptions}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
      filterOptions={(options) => options} // We're already filtering
      freeSolo
      disableClearable
      value=""
      onChange={handleAutocompleteChange}
      inputValue={inputValue}
      onInputChange={(_, value, reason) => {
        if (reason === 'input') {
          // Handled by our custom onChange
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          {...textFieldProps}
          inputRef={inputRef}
          onChange={handleInputChange}
          InputProps={{
            ...params.InputProps,
            ...textFieldProps.InputProps,
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                fontFamily: 'monospace', 
                color: option.type === 'random' ? '#4caf50' : '#2196f3' 
              }}>
                {option.reference}
              </span>
              {option.type === 'step' && (
                <span style={{ marginLeft: 8, color: 'text.secondary' }}>
                  {option.name}
                </span>
              )}
            </div>
            {option.type === 'random' && (
              <span style={{ fontSize: '0.85em', color: 'text.secondary', marginTop: 2 }}>
                {option.label}
              </span>
            )}
          </div>
        </li>
      )}
      PopperComponent={(props) => (
        <Popper 
          {...props} 
          placement="bottom-start" 
          style={{ 
            width: autocompleteType === 'random' ? 600 : 'auto',
            maxWidth: '90vw' 
          }} 
        />
      )}
    />
  );
}
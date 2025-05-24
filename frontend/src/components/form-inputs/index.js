import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { NumericFormat } from 'react-number-format';

// Input para números formatados
export const InputNumber = ({ label, value, onChange, error, helperText, ...props }) => {
  return (
    <NumericFormat
      customInput={TextField}
      label={label}
      value={value}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      error={error}
      helperText={helperText}
      {...props}
    />
  );
};

// Input para CEP formatado
export const InputCep = ({ label, value, onChange, error, helperText, ...props }) => {
  return (
    <NumericFormat
      customInput={TextField}
      label={label}
      value={value}
      format="#####-###"
      mask="_"
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      error={error}
      helperText={helperText}
      {...props}
    />
  );
};

export default {
  InputNumber,
  InputCep
}; 
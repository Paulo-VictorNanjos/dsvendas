import React from 'react';
import PropTypes from 'prop-types';
import { TextField } from '@mui/material';
import { NumericFormat } from 'react-number-format';

/**
 * Componente para entrada de valores numéricos formatados
 */
const NumericTextField = ({
  value,
  onValueChange = () => {},
  prefix = '',
  suffix = '',
  decimalSeparator = ',',
  thousandSeparator = '.',
  decimalScale = 2,
  allowNegative = false,
  isAllowed,
  ...props
}) => {
  // Verificar se o valor é um número válido para exibição
  const displayValue = value !== undefined && value !== null && value !== '' ? value : '';

  return (
    <NumericFormat
      customInput={TextField}
      value={displayValue}
      onValueChange={onValueChange}
      thousandSeparator={thousandSeparator}
      decimalSeparator={decimalSeparator}
      decimalScale={decimalScale}
      fixedDecimalScale
      allowNegative={allowNegative}
      prefix={prefix}
      suffix={suffix}
      isAllowed={isAllowed}
      {...props}
    />
  );
};

NumericTextField.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onValueChange: PropTypes.func,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
  decimalSeparator: PropTypes.string,
  thousandSeparator: PropTypes.string,
  decimalScale: PropTypes.number,
  allowNegative: PropTypes.bool,
  isAllowed: PropTypes.func,
};

export default NumericTextField; 
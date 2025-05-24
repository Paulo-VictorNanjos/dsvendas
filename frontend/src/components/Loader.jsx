import React from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

const Loader = ({ message = 'Carregando...', fullHeight = false }) => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{
        height: fullHeight ? '100vh' : 'auto',
        minHeight: fullHeight ? 'auto' : '200px',
        width: '100%',
        p: 3
      }}
    >
      <CircularProgress color="primary" />
      {message && (
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ mt: 2, textAlign: 'center' }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default Loader; 
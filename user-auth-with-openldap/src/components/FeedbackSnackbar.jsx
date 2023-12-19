import React from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

const FeedbackSnackbar = ({ open, onClose, isError, message }) => {
  return (
    <Snackbar
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      open={open}
      autoHideDuration={3000}
      onClose={onClose}
    >
      <Alert severity={isError ? 'error' : 'success'}>
        {message}
      </Alert>
    </Snackbar>
  )
}

export default FeedbackSnackbar

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import LocaleSwitcher from './LocaleSwitcher'
import Copyright from './Copyright'

export default function LayoutUnlogin({ snackbar: [openSnackbar, setOpenSnackbar], children }) {
  return (
    <Container component="main" maxWidth="xs">
      {!!openSnackbar && (
        <Snackbar
          open
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          autoHideDuration={3000}
          onClose={() => setOpenSnackbar(false)}
        >
          <Alert severity={openSnackbar?.severity} sx={{ width: '100%' }}>
            {openSnackbar?.message}
          </Alert>
        </Snackbar>
      )}

      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {children}
      </Box>

      <Box sx={{
        marginTop: 8,
        marginBottom: 4,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}>
        <LocaleSwitcher color="primary" />
        <Copyright />
      </Box>
    </Container>
  )
}
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://huoyijie.cn">
        huoyijie.cn
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  )
}

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

      <Copyright sx={{ mt: 8, mb: 4 }} />
    </Container>
  )
}
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Copyright from './Copyright'

export default function LayoutUnlogin({ children }) {
  return (
    <Container component="main" maxWidth="xs">
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
        <Copyright />
      </Box>
    </Container>
  )
}
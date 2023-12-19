import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Copyright from './Copyright'

export default function StickyFooter() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
      }}
    >
      <Container maxWidth="sm">
        <Copyright />
      </Container>
    </Box>
  )
}
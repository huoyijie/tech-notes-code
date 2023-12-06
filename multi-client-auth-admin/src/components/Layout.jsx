import { useState } from 'react'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Container from '@mui/material/Container'
import Copyright from './Copyright'
import AppBar from './AppBar'
import Drawer from './Drawer'

export default function Layout({ page, children }) {
  const [openDrawer, setOpenDrawer] = useState(true)
  const toggleDrawer = () => {
    setOpenDrawer(!openDrawer)
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar {...{ openDrawer, toggleDrawer, page }} />

      <Drawer {...{ openDrawer, toggleDrawer }} />

      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {children}
          <Copyright sx={{ pt: 4 }} />
        </Container>
      </Box>
    </Box>
  )
}
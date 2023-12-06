import { useState } from 'react'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Container from '@mui/material/Container'
import AppBar from './AppBar'
import Drawer from './Drawer'
import StickyFooter from './StickyFooter'
import { createTheme, ThemeProvider } from '@mui/material'

const drawerWidth = 240

export default function Layout({ page, children }) {
  const [darkMode, setDarkMode] = useState(false)
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  }

  const [openDrawer, setOpenDrawer] = useState(true)
  const toggleDrawer = () => {
    setOpenDrawer(!openDrawer)
  }

  const lightTheme = createTheme({
    palette: {
      mode: 'light',
    },
  })
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
  })
  const currentTheme = darkMode ? darkTheme : lightTheme

  return (
    <ThemeProvider theme={currentTheme}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <AppBar {...{ darkMode, toggleDarkMode, openDrawer, toggleDrawer, drawerWidth, page }} />

        <Drawer {...{ openDrawer, toggleDrawer, drawerWidth }} />

        <Box
          component="main"
          sx={{
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[100]
                : theme.palette.grey[900],
            flexGrow: 1,
            height: '100%',
            overflowX: 'hidden',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '0.6em',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,.2)',
            },
            '&:hover': {
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,.4)',
              },
            },
          }}
        >
          <Container
            maxWidth="lg"
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Toolbar />

            <Box sx={{ mt: 4 }}>
              {children}
            </Box>

            <StickyFooter />
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  )
}
import MuiAppBar from '@mui/material/AppBar'
import { styled } from '@mui/material/styles'
import Badge from '@mui/material/Badge'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Brightness4 from '@mui/icons-material/Brightness4'
import Brightness7 from '@mui/icons-material/Brightness7'
import Stack from '@mui/material/Stack'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Settings from '@mui/icons-material/Settings'
import Logout from '@mui/icons-material/Logout'
import { useRef, useState } from 'react'
import useToken from './hooks/useToken'
import useMutation from './hooks/useMutation'
import { useRouter } from 'next/router'

const StyledAppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open, width }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: width,
    width: `calc(100% - ${width}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}))

export default function AppBar({ darkMode, toggleDarkMode, openDrawer, toggleDrawer, drawerWidth, page }) {
  const router = useRouter()
  const avatarRef = useRef()
  const [open, setOpen] = useState(false)
  const toggleOpen = () => setOpen(!open)

  const token = useToken()
  const { trigger } = useMutation({ url: '/api/token/revoke' })
  const logout = async () => {
    if (token.value) {
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
      } = token.value
      try {
        await trigger({ accessToken, refreshToken })
      } catch (error) { }
      token.remove()
    }
    router.push('/signin')
  }

  return (
    <StyledAppBar position="absolute" open={openDrawer} width={drawerWidth}>
      <Toolbar
        sx={{
          pr: '24px', // keep right padding when drawer closed
        }}
      >
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={toggleDrawer}
          sx={{
            marginRight: '36px',
            ...(openDrawer && { display: 'none' }),
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          component="h1"
          variant="h6"
          color="inherit"
          noWrap
          sx={{ flexGrow: 1 }}
        >
          {page}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={2}
        >
          <IconButton onClick={toggleDarkMode} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <IconButton color="inherit">
            <Badge badgeContent={4} color="secondary">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Tooltip title="Account settings">
            <IconButton
              ref={avatarRef}
              color="inherit"
              onClick={toggleOpen}
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar alt="avatar" src="/images/avatar.jpg" sx={{ width: 32, height: 32 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>

      <Menu
        anchorEl={avatarRef.current}
        id="account-menu"
        open={open}
        onClose={toggleOpen}
        onClick={toggleOpen}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              '& .MuiAvatar-root': {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem>
          <Avatar /> huoyijie@huoyijie.cn
        </MenuItem>
        <Divider />
        <MenuItem>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </StyledAppBar>
  )
}
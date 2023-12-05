import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Link from '@mui/material/Link'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Typography from '@mui/material/Typography'
import LayoutUnlogin from './LayoutUnlogin'
import { useForm, Controller } from 'react-hook-form'
import usePost from './hooks/usePost'
import { useState } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useTranslations } from 'next-intl'

const appId = process.env.NEXT_PUBLIC_API_ID
const appSecret = process.env.NEXT_PUBLIC_API_SECRET

function clearStorage(key) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export default function SignIn() {
  const t = useTranslations('signin')
  const [loading, setLoading] = useState(false)
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const { submit: grantToken } = usePost('/api/token/grant')

  const { handleSubmit, control, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password, rememberMe }) => {
    setLoading(true)
    const { data, error } = await grantToken({
      appId,
      appSecret,
      email,
      password,
    })
    if (error) {
      setOpenSnackbar({ severity: 'error', message: error.message })
    } else {
      setOpenSnackbar({ severity: 'success', message: 'Login successful' })

      clearStorage('access_token')
      clearStorage('refresh_token')

      const storage = rememberMe ? localStorage : sessionStorage
      const { access_token, refresh_token } = data
      storage.setItem('access_token', access_token)
      storage.setItem('refresh_token', refresh_token)
    }
    setLoading(false)
  }

  return (
    <LayoutUnlogin>
      <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        {t('SignInAdmin')}
      </Typography>

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

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
        <Controller
          name="email"
          control={control}
          rules={{
            required: t('EmailRequired'),
            pattern: {
              value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
              message: t('InvalidEmailFormat'),
            }
          }}
          defaultValue=""
          render={({ field }) => (
            <TextField
              id="email"
              label={t('EmailAddress')}
              error={!!errors.email}
              helperText={errors.email?.message}
              {...field}
              margin="normal"
              required
              fullWidth
              autoComplete="email"
              autoFocus
              disabled={loading}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          rules={{
            required: t('PasswordRequired'),
            minLength: {
              value: 6,
              message: t('PasswordTooShort'),
            },
          }}
          defaultValue=""
          render={({ field }) => (
            <TextField
              id="password"
              type="password"
              label={t('Password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              {...field}
              margin="normal"
              required
              fullWidth
              autoComplete="current-password"
              disabled={loading}
            />
          )}
        />
        <Controller
          name="rememberMe"
          control={control}
          defaultValue={false}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  id="rememberMe"
                  value="true"
                  {...field}
                  color="primary"
                  disabled={loading}
                />
              }
              label={t('RememberMe')}
            />
          )}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{ mt: 3, mb: 2 }}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            t('SignIn')
          )}
        </Button>
        <Grid container>
          <Grid item xs>
            <Link href="#" variant="body2">
              {t('ForgetPassword')}
            </Link>
          </Grid>
          <Grid item>
            <Typography component="span" variant="body2">
              {t('WithoutAccount')}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </LayoutUnlogin>
  )
}
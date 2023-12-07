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
import useMutation from './hooks/useMutation'
import { useState } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import { useTranslations } from 'next-intl'
import util from '@/lib/util'
import { useRouter } from 'next/router'
import useToken from './hooks/useToken'

const appId = process.env.NEXT_PUBLIC_API_ID
const appSecret = process.env.NEXT_PUBLIC_API_SECRET

export default function SignIn() {
  const router = useRouter()
  const t = useTranslations('signin')
  const snackbar = useState(false)
  const [, setOpenSnackbar] = snackbar
  const token = useToken()

  const { trigger: grantToken, isMutating } = useMutation({ url: '/api/token/grant' })
  const [submitting, setSubmitting] = useState(false)
  const disabled = isMutating || submitting

  const { handleSubmit, control, formState: { errors } } = useForm()

  const onSubmit = async ({ email, password }) => {
    setSubmitting(true)
    const { data, error } = await grantToken({
      appId,
      appSecret,
      email,
      password,
    })
    if (error) {
      setOpenSnackbar({ severity: 'error', message: error.message })
      setSubmitting(false)
    } else {
      setOpenSnackbar({ severity: 'success', message: t('LoginSuccessful') })
      token.set(data)

      await util.wait(1000)
      router.push('/')
    }
  }

  return (
    <LayoutUnlogin snackbar={snackbar}>
      <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        {t('SignInAdmin')}
      </Typography>

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
              disabled={disabled}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          rules={{
            required: t('PasswordRequired'),
            minLength: {
              value: 5,
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
              disabled={disabled}
            />
          )}
        />
        <Controller
          name="rememberMe"
          control={control}
          rules={{
            onChange: (e) => token.setRememberMe(e.target.value),
          }}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  id="rememberMe"
                  {...field}
                  checked={token.rememberMe}
                  disabled={disabled}
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
          disabled={disabled}
          sx={{ mt: 3, mb: 2 }}
        >
          {isMutating ? (
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
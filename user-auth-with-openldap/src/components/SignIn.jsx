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
import util from '@/lib/util'
import { useRouter } from 'next/router'
import useToken from './hooks/useToken'
import FeedbackSnackbar from './FeedbackSnackbar'

export default function SignIn() {
  const router = useRouter()
  const [showFeedback, setShowFeedback] = useState(false)
  const token = useToken()

  const { trigger: grantToken, isMutating, error } = useMutation({ url: '/api/token/grant' })
  const [submitting, setSubmitting] = useState(false)
  const disabled = isMutating || submitting

  const { handleSubmit, control, formState: { errors } } = useForm()

  const onSubmit = async ({ username, password }) => {
    setSubmitting(true)

    try {
      const data = await grantToken({
        username,
        password,
      })
      token.set(data)
      setShowFeedback(true)
      await util.wait(1000)
      router.push('/')
    } catch (error) {
      setShowFeedback(true)
      setSubmitting(false)
    }
  }

  return (
    <LayoutUnlogin>
      <FeedbackSnackbar open={showFeedback} isError={!!error} message={error?.message || '登录成功'} onClose={() => setShowFeedback(false)} />

      <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        登录管理后台
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
        <Controller
          name="username"
          control={control}
          rules={{
            required: '请输入用户名',
            minLength: {
              value: 6,
              message: '用户名长度不能小于6'
            },
            maxLength: {
              value: 32,
              message: '用户名长度不能大于32'
            },
          }}
          defaultValue=""
          render={({ field }) => (
            <TextField
              id="username"
              label="用户名"
              error={!!errors.username}
              helperText={errors.username?.message}
              {...field}
              margin="normal"
              required
              fullWidth
              autoComplete="username"
              autoFocus
              disabled={disabled}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          rules={{
            required: '请输入密码',
            minLength: {
              value: 6,
              message: '密码长度不能小于6',
            },
            maxLength: {
              value: 32,
              message: '密码长度不能大于32'
            },
          }}
          defaultValue=""
          render={({ field }) => (
            <TextField
              id="password"
              type="password"
              label="密码"
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
              label="记住我"
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
            '登录'
          )}
        </Button>
        <Grid container>
          <Grid item xs>
            <Link href="#" variant="body2">
              忘记密码
            </Link>
          </Grid>
          <Grid item>
            <Typography component="span" variant="body2">
              没有账号？请联系管理员
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </LayoutUnlogin>
  )
}
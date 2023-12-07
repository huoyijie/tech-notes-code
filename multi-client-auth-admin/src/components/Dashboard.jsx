import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Chart from './Chart'
import Deposits from './Deposits'
import Orders from './Orders'
import Layout from './Layout'
import { useTranslations } from 'next-intl'
import useQuery from './hooks/useQuery'
import Loading from './Loading'
import FeedbackSnackbar from './FeedbackSnackbar'
import { useState } from 'react'

export default function Dashboard() {
  const t = useTranslations('dashboard')
  const { data, error, isLoading, isValidating } = useQuery({ url: '/api/admin' })
  const [showFeedback, setShowFeedback] = useState(!!error)

  return (
    <Layout page={t('Dashboard')}>
      {(isLoading || isValidating) && (
        <Loading />
      )}

      <FeedbackSnackbar open={showFeedback} isError message={error?.message} onClose={() => setShowFeedback(false)} />

      {data && (
        <Grid container spacing={3}>
          {/* Chart */}
          <Grid item xs={12} md={8} lg={9}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 240,
              }}
            >
              <Chart />
            </Paper>
          </Grid>
          {/* Recent Deposits */}
          <Grid item xs={12} md={4} lg={3}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 240,
              }}
            >
              <Deposits />
            </Paper>
          </Grid>
          {/* Recent Orders */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Orders />
            </Paper>
          </Grid>
        </Grid>
      )}
    </Layout>
  )
}
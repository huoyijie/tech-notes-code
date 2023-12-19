import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Chart from './Chart'
import Deposits from './Deposits'
import Orders from './Orders'
import Layout from './Layout'
import useQuery from './hooks/useQuery'
import Loading from './Loading'
import FeedbackSnackbar from './FeedbackSnackbar'

export default function Dashboard() {
  const { data, error, isLoading, isValidating } = useQuery({ url: '/api/orders' })

  return (
    <Layout page="仪表盘">
      {(isLoading || isValidating) && (
        <Loading />
      )}

      <FeedbackSnackbar open={!!error} isError message={error?.message} />

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
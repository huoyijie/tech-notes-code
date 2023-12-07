import React from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import { styled } from '@mui/system'

const StyledLoadingContainer = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.6)',
  zIndex: 1000,
})

const Loading = () => {
  return (
    <StyledLoadingContainer>
      <CircularProgress />
    </StyledLoadingContainer>
  )
}

export default Loading


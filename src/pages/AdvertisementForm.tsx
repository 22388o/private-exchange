import React, { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { useWeb3React } from '@web3-react/core'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'
import Select from 'react-select'
import SMPPeer from 'js-smp-peer'
import { useAdvertiseMutation } from '../hooks/advertisement'
import { useSwap } from '../hooks/swap'
import useStore, { PEER_STATUS } from '../store/peer'
import { getOrGeneratePeerId } from '../utils/peer'
import PrimaryButton from '../components/PrimaryButton'
import ConnectWalletButton from '../components/ConnectWalletButton'
import Title from '../components/Title'
import { Input, Label, ErrorMessage, FormControl } from '../components/Form'
import { FONT_SIZE, RADIUS, SPACE, peerConfig, Tokens } from '../constants'
import { getFormErrorMessage } from '../errorMessages'
import tokens from '../tokenlist'

type FormData = {
  currency1: string
  currency2: string
  amount: number
  receiveAmount: number
}

const AdvertisementForm = () => {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid }
  } = useForm<FormData>({
    mode: 'onChange'
  })

  const store = useStore()
  const advertiseMutation = useAdvertiseMutation()
  const swapMutation = useSwap()
  const theme = useTheme()
  const { active } = useWeb3React()

  const onSubmit = handleSubmit(async (data) => {
    const peerId = getOrGeneratePeerId()
    try {
      setSubmitting(true)
      const res = await advertiseMutation.mutateAsync({ ...data, peerId })
      const receipt = await res.wait()
      if (receipt.status === 1) {
        toast.success('Advertise transaction succeeded!!', { icon: '🥳' })
      } else {
        toast.error('Advertise transaction failed...', { icon: '😥' })
      }
      setSubmitting(false)
    } catch (e) {
      console.log(e)
      toast.error('Advertise transaction failed...', { icon: '😥' })
      setSubmitting(false)
      return
    }
    // peer management
    // initialize SMPPeer and set peer to store
    const price = data.receiveAmount / data.amount
    store.setPeerStatus(PEER_STATUS.STARTING)
    const peer = new SMPPeer(price.toString(), peerId, peerConfig)
    await peer.connectToPeerServer()
    store.setPeer(peer)
    peer.on('incoming', async (remotePeerId: string, result: boolean) => {
      toast(
        `Incoming SMP finished. peerId: ${remotePeerId}, result: ${
          result ? 'Success' : 'Failed'
        }.`
      )

      // TODO: get remote peer zkAddress. when implement blind find
      if (result) {
        toast('Creating swap transaction')
        try {
          await swapMutation.mutateAsync({
            counterParty: remotePeerId,
            // @ts-ignore: TODO: post token address to peek-a-book-contract
            sendToken: Tokens[data.currency1],
            // @ts-ignore: TODO: post token address to peek-a-book-contract
            receiveToken: Tokens[data.currency2],
            receiveAmount: data.receiveAmount,
            sendAmount: data.amount
          })
          toast.success('Successfully create swap transaction.')
        } catch (e) {
          toast.error('Creating swap transaction failed.')
        }
      }
    })
    store.setPeerStatus(PEER_STATUS.RUNNING)
  })

  return (
    <Container>
      <Body>
        <PageHead>
          <Title>Create Advertisement</Title>
          <HeadLink
            onClick={() => {
              window.history.back()
            }}
          >
            &larr; Back
          </HeadLink>
        </PageHead>
        <FormContainer>
          <form onSubmit={onSubmit}>
            <FormControl>
              <Label>From token</Label>
              <Controller
                name="currency1"
                control={control}
                render={({ field: { onChange, onBlur } }) => (
                  <Select
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: RADIUS.M,
                        borderColor: !!errors.currency1
                          ? theme.error
                          : theme.border
                      })
                    }}
                    options={tokens.map((token) => ({
                      label: token.symbol,
                      value: token.symbol
                    }))}
                    onChange={(token) => {
                      if (!token) return
                      onChange(token.value)
                    }}
                    onBlur={onBlur}
                  />
                )}
                rules={{ required: true }}
              />
              <ErrorMessage>
                {getFormErrorMessage(errors.currency1?.type)}
              </ErrorMessage>
            </FormControl>

            <FormControl>
              <Label>To token</Label>
              <Controller
                name="currency2"
                control={control}
                render={({ field: { onChange, onBlur } }) => (
                  <Select
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        borderRadius: RADIUS.M,
                        borderColor: !!errors.currency2
                          ? theme.error
                          : theme.border
                      })
                    }}
                    options={tokens.map((token) => ({
                      label: token.symbol,
                      value: token.symbol
                    }))}
                    onChange={(token) => {
                      if (!token) return
                      onChange(token.value)
                    }}
                    onBlur={onBlur}
                  />
                )}
                rules={{ required: true }}
              />

              <ErrorMessage>
                {getFormErrorMessage(errors.currency2?.type)}
              </ErrorMessage>
            </FormControl>

            <FormControl>
              <Label>Amount (Send token)</Label>
              <Input
                {...register('amount', {
                  required: true,
                  validate: {
                    positiveNumber: (v) => v > 0
                  }
                })}
                placeholder="0.0"
                error={!!errors.amount}
              />
              <ErrorMessage>
                {getFormErrorMessage(errors.amount?.type)}
              </ErrorMessage>
            </FormControl>

            <FormControl>
              <Label>Amount (Receive token)</Label>
              <Input
                {...register('receiveAmount', {
                  required: true,
                  validate: {
                    positiveNumber: (v) => v > 0
                  }
                })}
                placeholder="0.0"
                error={!!errors.receiveAmount}
              />
              <ErrorMessage>
                {getFormErrorMessage(errors.receiveAmount?.type)}
              </ErrorMessage>
            </FormControl>

            {!active ? (
              <ConnectWalletButton />
            ) : !isValid ? (
              <SubmitButton disabled>Fill the form</SubmitButton>
            ) : submitting ? (
              <SubmitButton disabled>Submitting...</SubmitButton>
            ) : (
              <SubmitButton>Create Advertisement</SubmitButton>
            )}
          </form>
        </FormContainer>
      </Body>
    </Container>
  )
}

const Container = styled.div`
  width: 100vw;
  display: flex;
  justify-content: center;
`

const Body = styled.div`
  width: 100%;
  max-width: 600px;
  padding: ${SPACE.XL} ${SPACE.XXL};
`

const PageHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const HeadLink = styled.a`
  cursor: pointer;
  font-weight: 600;
`
export const FormContainer = styled.div`
  background-color: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.onSurface};
  box-shadow: 0 1px 4px ${({ theme }) => theme.shadow};
  border-radius: ${RADIUS.M};
  padding: ${SPACE.M};
`

const SubmitButton = styled(PrimaryButton)`
  font-size: ${FONT_SIZE.M};
  font-weight: 600;
  width: 100%;
  padding: 12px;
`

export default AdvertisementForm

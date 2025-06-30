// Inspired by react-hot-toast library
import * as React from "react"
import type { ToastProps } from "@/components/ui/toast"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactElement
}

const ADD_TOAST = "ADD_TOAST"
const UPDATE_TOAST = "UPDATE_TOAST"
const DISMISS_TOAST = "DISMISS_TOAST"
const REMOVE_TOAST = "REMOVE_TOAST"

let count = 0

function genId() {
  count = (count + 1) % 1_000_000
  return count.toString()
}

type Action =
  | {
    type: typeof ADD_TOAST
    toast: ToasterToast
  }
  | {
    type: typeof UPDATE_TOAST
    toast: Partial<ToasterToast>
  }
  | {
    type: typeof DISMISS_TOAST
    toastId?: ToasterToast["id"]
  }
  | {
    type: typeof REMOVE_TOAST
    toastId?: ToasterToast["id"]
  }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: REMOVE_TOAST,
      toastId: toastId,
    })
  }, 1000000)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts],
      }

    case UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case DISMISS_TOAST: {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
              ...t,
              open: false,
            }
            : t
        ),
      }
    }
    case REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast(props: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: UPDATE_TOAST,
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: DISMISS_TOAST, toastId: id })

  dispatch({
    type: ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: DISMISS_TOAST, toastId }),
  }
}

export { useToast, toast } 
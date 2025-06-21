"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 rounded-lg border backdrop-blur-sm p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-slate-700/50 bg-slate-800/90 text-slate-100",
        destructive: "border-slate-700/50 bg-slate-800/90 text-slate-100",
        success: "border-slate-700/50 bg-slate-800/90 text-slate-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

interface ToastPropsType extends React.ComponentPropsWithoutRef<"div">, VariantProps<typeof toastVariants> {
  duration?: number
  onClose?: () => void
  onClick?: () => void
  clickable?: boolean
}

const Toast = React.forwardRef<React.ElementRef<"div">, ToastPropsType>(
  ({ className, variant, duration = 5000, onClose, onClick, clickable = false, children, ...props }, ref) => {
    const [progress, setProgress] = React.useState(100)
    const [isPaused, setIsPaused] = React.useState(false)
    const intervalRef = React.useRef<NodeJS.Timeout>()
    const startTimeRef = React.useRef<number>()
    const remainingTimeRef = React.useRef<number>(duration)

    React.useEffect(() => {
      if (duration <= 0) return

      const startTimer = () => {
        startTimeRef.current = Date.now()
        intervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current!
          const remaining = Math.max(0, remainingTimeRef.current - elapsed)
          const newProgress = (remaining / duration) * 100

          setProgress(newProgress)

          if (remaining <= 0) {
            clearInterval(intervalRef.current)
            onClose?.()
          }
        }, 50)
      }

      if (!isPaused) {
        startTimer()
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }, [duration, onClose, isPaused])

    const handleMouseEnter = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        const elapsed = Date.now() - startTimeRef.current!
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
        setIsPaused(true)
      }
    }

    const handleMouseLeave = () => {
      setIsPaused(false)
    }

    const handleClick = (e: React.MouseEvent) => {
      // Don't trigger click if clicking on the close button
      if ((e.target as HTMLElement).closest("[data-toast-close]")) {
        return
      }

      if (clickable && onClick) {
        onClick()
      }
    }

    const getProgressColor = () => {
      switch (variant) {
        case "success":
          return "bg-green-500"
        case "destructive":
          return "bg-red-500"
        default:
          return "bg-blue-500"
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          toastVariants({ variant }),
          clickable && "cursor-pointer hover:bg-slate-700/90 transition-colors",
          "overflow-hidden", // Ensure progress bar doesn't overflow
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        {...props}
      >
        {children}
        {duration > 0 && (
          <div className="absolute bottom-0 -left-4 -right-4 h-1 bg-slate-700/30">
            <div
              className={cn("h-full transition-all duration-75 ease-linear", getProgressColor())}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    )
  },
)
Toast.displayName = "Toast"

const ToastAction = React.forwardRef<React.ElementRef<"button">, React.ComponentPropsWithoutRef<"button">>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
)
ToastAction.displayName = "ToastAction"

const ToastClose = React.forwardRef<React.ElementRef<"button">, React.ComponentPropsWithoutRef<"button">>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      data-toast-close
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-slate-400 opacity-70 transition-opacity hover:text-slate-200 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-500",
        className,
      )}
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  ),
)
ToastClose.displayName = "ToastClose"

const ToastTitle = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm font-semibold", className)} {...props} />,
)
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("text-sm opacity-90", className)} {...props} />,
)
ToastDescription.displayName = "ToastDescription"

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export { type ToastProps, type ToastActionElement, Toast, ToastAction, ToastClose, ToastTitle, ToastDescription }

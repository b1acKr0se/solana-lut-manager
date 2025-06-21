"use client"

import { useToast } from "@/components/ui/use-toast"
import { Toast, ToastClose, ToastDescription, ToastTitle } from "@/components/ui/toast"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  const getIcon = (variant: string) => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
      case "destructive":
        return <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
    }
  }

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts
        .filter((toast) => toast.open !== false)
        .map(({ id, title, description, action, variant, duration, onClose, onClick, clickable, ...props }) => (
          <Toast
            key={id}
            variant={variant}
            duration={duration}
            onClose={onClose}
            onClick={onClick}
            clickable={clickable}
            className="mb-2"
            {...props}
          >
            <div className="flex items-start space-x-3 flex-1">
              {getIcon(variant || "default")}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose onClick={() => dismiss(id)} />
          </Toast>
        ))}
    </div>
  )
}

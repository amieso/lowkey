'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { STYLE_LABELS, PRODUCT_TYPE_LABELS, VideoStyle, ProductType } from '@/types/video'
import {
  submissionStep1Schema,
  submissionStep2Schema,
  submissionStep3Schema,
  type SubmissionFormData,
} from '@/lib/validations'

const STEPS = [
  { title: 'Video Info' },
  { title: 'Details' },
  { title: 'Contact' },
]

export function SubmissionForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<Partial<SubmissionFormData>>({
    videoUrl: '',
    title: '',
    company: '',
    description: '',
    style: 'kinetic-text',
    productType: 'saas',
    websiteUrl: '',
    twitterUrl: '',
    submitterEmail: '',
  })

  const updateField = (field: keyof SubmissionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validateStep = (step: number): boolean => {
    const schemas = [submissionStep1Schema, submissionStep2Schema, submissionStep3Schema]
    const schema = schemas[step]

    const fieldsForStep: (keyof SubmissionFormData)[][] = [
      ['videoUrl', 'title', 'company'],
      ['description', 'style', 'productType'],
      ['websiteUrl', 'twitterUrl', 'submitterEmail'],
    ]

    const dataForStep = fieldsForStep[step].reduce((acc, field) => {
      acc[field] = formData[field]
      return acc
    }, {} as Record<string, unknown>)

    const result = schema.safeParse(dataForStep)

    if (!result.success) {
      const newErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message
        }
      })
      setErrors(newErrors)
      return false
    }

    setErrors({})
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep(currentStep)) {
      return
    }

    setIsSubmitting(true)

    // Simulate API call (replace with real API in Phase B)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    console.log('Submission:', formData)
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-foreground/5 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-base font-medium text-foreground mb-1">
          Thanks for submitting
        </h3>
        <p className="text-sm text-muted mb-6">
          We'll review your video and add it shortly.
        </p>
        <div className="flex gap-2 justify-center">
          <Button
            variant="secondary"
            onClick={() => {
              setIsSuccess(false)
              setCurrentStep(0)
              setFormData({
                videoUrl: '',
                title: '',
                company: '',
                description: '',
                style: 'kinetic-text',
                productType: 'saas',
                websiteUrl: '',
                twitterUrl: '',
                submitterEmail: '',
              })
            }}
          >
            Submit another
          </Button>
          <Button onClick={() => (window.location.href = '/')}>
            Browse videos
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Progress Indicator */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((step, index) => (
          <div key={index} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => index < currentStep && setCurrentStep(index)}
              disabled={index > currentStep}
              className={cn(
                'text-sm transition-colors',
                index === currentStep
                  ? 'text-foreground font-medium'
                  : index < currentStep
                  ? 'text-muted hover:text-foreground cursor-pointer'
                  : 'text-muted/50 cursor-not-allowed'
              )}
            >
              {step.title}
            </button>
            {index < STEPS.length - 1 && (
              <span className="text-sm text-muted/50 mx-1">/</span>
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Video Info */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <Input
            label="Video URL"
            placeholder="https://youtube.com/watch?v=..."
            value={formData.videoUrl}
            onChange={(e) => updateField('videoUrl', e.target.value)}
            error={errors.videoUrl}
          />
          <Input
            label="Title"
            placeholder="Product Launch 2024"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            error={errors.title}
          />
          <Input
            label="Company / Product"
            placeholder="Acme Inc"
            value={formData.company}
            onChange={(e) => updateField('company', e.target.value)}
            error={errors.company}
          />
        </div>
      )}

      {/* Step 2: Details */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              className={cn(
                'w-full h-24 px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted transition-colors focus:outline-none focus:border-foreground resize-none',
                errors.description && 'border-red-500 focus:border-red-500'
              )}
              placeholder="Tell us about this video..."
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Style
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(STYLE_LABELS) as [VideoStyle, string][]).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField('style', value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm transition-colors',
                      formData.style === value
                        ? 'bg-foreground text-background'
                        : 'text-muted hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(PRODUCT_TYPE_LABELS) as [ProductType, string][]).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField('productType', value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm transition-colors',
                      formData.productType === value
                        ? 'bg-foreground text-background'
                        : 'text-muted hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Contact */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <Input
            label="Website URL (optional)"
            placeholder="https://yourproduct.com"
            value={formData.websiteUrl}
            onChange={(e) => updateField('websiteUrl', e.target.value)}
            error={errors.websiteUrl}
          />
          <Input
            label="Twitter URL (optional)"
            placeholder="https://twitter.com/yourhandle"
            value={formData.twitterUrl}
            onChange={(e) => updateField('twitterUrl', e.target.value)}
            error={errors.twitterUrl}
          />
          <Input
            label="Your Email"
            type="email"
            placeholder="you@example.com"
            value={formData.submitterEmail}
            onChange={(e) => updateField('submitterEmail', e.target.value)}
            error={errors.submitterEmail}
          />
          <p className="text-xs text-muted">
            We'll notify you when your video is live.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-border">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={prevStep}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {currentStep < STEPS.length - 1 ? (
          <Button type="button" onClick={nextStep}>
            Continue
          </Button>
        ) : (
          <Button type="submit" loading={isSubmitting}>
            Submit
          </Button>
        )}
      </div>
    </form>
  )
}

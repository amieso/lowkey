import { z } from 'zod'

export const submissionStep1Schema = z.object({
  videoUrl: z.string().url('Please enter a valid URL'),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  company: z.string().min(2, 'Company name is required'),
})

export const submissionStep2Schema = z.object({
  description: z.string().min(20, 'Description must be at least 20 characters'),
  style: z.enum(['kinetic-text', '3d', 'motion-graphics', 'product-demo', 'mixed']),
  productType: z.enum(['saas', 'mobile-app', 'consumer', 'dev-tool', 'other']),
})

export const submissionStep3Schema = z.object({
  websiteUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  submitterEmail: z.string().email('Please enter a valid email'),
})

export const fullSubmissionSchema = submissionStep1Schema
  .merge(submissionStep2Schema)
  .merge(submissionStep3Schema)

export type SubmissionFormData = z.infer<typeof fullSubmissionSchema>
export type Step1Data = z.infer<typeof submissionStep1Schema>
export type Step2Data = z.infer<typeof submissionStep2Schema>
export type Step3Data = z.infer<typeof submissionStep3Schema>

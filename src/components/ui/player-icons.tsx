interface IconProps {
  className?: string
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.8864 8.304C17.1397 9.08734 17.1397 10.9127 15.8864 11.696L6.45999 17.5875C5.1279 18.4201 3.39999 17.4624 3.39999 15.8915L3.39999 4.10849C3.39999 2.53762 5.1279 1.57994 6.45999 2.4125L15.8864 8.304Z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  )
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.25" y="2.5" width="4" height="15" rx="2" />
      <rect x="12.75" y="2.5" width="4" height="15" rx="2" />
    </svg>
  )
}

export function ExpandIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2H15.5C16.8807 2 18 3.11929 18 4.5V7M7 2H4.5C3.11929 2 2 3.11929 2 4.5V7M18 13V15.5C18 16.8807 16.8807 18 15.5 18H13M7 18H4.5C3.11929 18 2 16.8807 2 15.5V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function MinimizeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2V4.5C13 5.88071 14.1193 7 15.5 7H18M7 2V4.5C7 5.88071 5.88071 7 4.5 7H2M18 13H15.5C14.1193 13 13 14.1193 13 15.5V18M7 18V15.5C7 14.1193 5.88071 13 4.5 13H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function SoundFullIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 7C1 6.44772 1.44772 6 2 6H4.13008C4.36879 6 4.59962 5.91461 4.78087 5.75926L7.61065 3.33373C7.80369 3.16826 8.10185 3.23765 8.202 3.47134C9.98875 7.64041 9.98875 12.3596 8.202 16.5287C8.10185 16.7624 7.80369 16.8317 7.61065 16.6663L4.78087 14.2407C4.59962 14.0854 4.36879 14 4.13008 14H2C1.44772 14 1 13.5523 1 13V10V7Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13.4721 7.24997C13.9549 8.035 14.2224 8.93326 14.248 9.85447C14.2735 10.7757 14.0561 11.6874 13.6177 12.498" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16.3674 4.75412C17.5222 6.1558 18.1822 7.89935 18.2451 9.71437C18.3079 11.5294 17.7702 13.3144 16.7151 14.7927" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function SoundMidIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 7C1 6.44772 1.44772 6 2 6H4.13008C4.36879 6 4.59962 5.91461 4.78087 5.75926L7.61065 3.33373C7.80369 3.16826 8.10185 3.23765 8.202 3.47134C9.98875 7.64041 9.98875 12.3596 8.202 16.5287C8.10185 16.7624 7.80369 16.8317 7.61065 16.6663L4.78087 14.2407C4.59962 14.0854 4.36879 14 4.13008 14H2C1.44772 14 1 13.5523 1 13V10V7Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M13.4721 7.24997C13.9549 8.035 14.2224 8.93326 14.248 9.85447C14.2735 10.7757 14.0561 11.6874 13.6177 12.498" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16.3674 4.75412C17.5222 6.1558 18.1822 7.89935 18.2451 9.71437C18.3079 11.5294 17.7702 13.3144 16.7151 14.7927" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function SoundOffIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 7C1 6.44772 1.44772 6 2 6H4.13008C4.36879 6 4.59962 5.91461 4.78087 5.75926L7.61065 3.33373C7.80369 3.16826 8.10185 3.23765 8.202 3.47134C9.98875 7.64041 9.98875 12.3596 8.202 16.5287C8.10185 16.7624 7.80369 16.8317 7.61065 16.6663L4.78087 14.2407C4.59962 14.0854 4.36879 14 4.13008 14H2C1.44772 14 1 13.5523 1 13V10V7Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M17.3925 7.35596L12.7963 11.9522" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.7963 7.36133L17.3925 11.9575" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function SkipForwardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.552 19.12C8.696 19.12 8.012 18.896 7.5 18.448C6.996 17.992 6.744 17.376 6.744 16.6H8.244C8.244 16.976 8.364 17.272 8.604 17.488C8.844 17.704 9.164 17.812 9.564 17.812C9.964 17.812 10.28 17.7 10.512 17.476C10.744 17.252 10.86 16.948 10.86 16.564V15.988C10.86 15.596 10.748 15.292 10.524 15.076C10.3 14.852 9.984 14.74 9.576 14.74H7.044V10.24H12.036V11.596H8.46L8.472 13.42H9.648C10.512 13.42 11.18 13.644 11.652 14.092C12.124 14.54 12.36 15.172 12.36 15.988V16.564C12.36 17.356 12.108 17.98 11.604 18.436C11.108 18.892 10.424 19.12 9.552 19.12Z" fill="currentColor"/>
      <path d="M6.5 3.5H12.3333M12.3333 3.5L9.83333 1M12.3333 3.5L9.83333 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function SkipBackwardIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.552 19.12C8.696 19.12 8.012 18.896 7.5 18.448C6.996 17.992 6.744 17.376 6.744 16.6H8.244C8.244 16.976 8.364 17.272 8.604 17.488C8.844 17.704 9.164 17.812 9.564 17.812C9.964 17.812 10.28 17.7 10.512 17.476C10.744 17.252 10.86 16.948 10.86 16.564V15.988C10.86 15.596 10.748 15.292 10.524 15.076C10.3 14.852 9.984 14.74 9.576 14.74H7.044V10.24H12.036V11.596H8.46L8.472 13.42H9.648C10.512 13.42 11.18 13.644 11.652 14.092C12.124 14.54 12.36 15.172 12.36 15.988V16.564C12.36 17.356 12.108 17.98 11.604 18.436C11.108 18.892 10.424 19.12 9.552 19.12Z" fill="currentColor"/>
      <path d="M12.3333 3.5H6.5M6.5 3.5L9 1M6.5 3.5L9 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9.9999H17M17 9.9999L11.7751 4.3999M17 9.9999L11.7751 15.5999" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.5 5.5L14.5 14.5M14.5 5.5L5.5 14.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  )
}

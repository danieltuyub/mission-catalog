import { useTranslation } from 'react-i18next'

export default function ContactPage() {
  const { t } = useTranslation('auth')
  return <p className="py-24 text-center text-gray-500">{t('contact')}</p>
}

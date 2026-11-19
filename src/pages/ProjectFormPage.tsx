import { useTranslation } from 'react-i18next'
import BackLink from '../components/BackLink'
import ProjectCreator from '../components/ProjectCreator'
import PageHeader from '../components/PageHeader'
import { originBack, readEditOrigin } from '../services/editOrigin'

export default function ProjectFormPage() {
  const { t } = useTranslation('project')
  // Opened from a list (the admin panel): saving or cancelling leads back to it.
  const origin = readEditOrigin()
  const back = originBack(origin ?? 'lista')
  const goBack = () => {
    window.location.hash = back.href
  }

  const created = (project: { id: string }) => {
    if (origin) goBack()
    else window.location.hash = `#/proyectos/${project.id}`
  }

  return (
    <div className="mx-auto w-[94%] max-w-3xl">
      <nav aria-label={t('back')} className="pb-4">
        <BackLink href={back.href}>{back.label}</BackLink>
      </nav>
      <PageHeader title={t('new')} />
      <ProjectCreator onCreated={created} onCancel={goBack} />
    </div>
  )
}

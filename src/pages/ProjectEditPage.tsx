import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import BackLink from '../components/BackLink'
import PageHeader from '../components/PageHeader'
import ProjectEditor from '../components/ProjectEditor'
import { originBack, readEditOrigin } from '../services/editOrigin'

export default function ProjectEditPage({ id }: { id: string }) {
  const { t } = useTranslation('project')
  // Back where the user came from: a list, or (by default) the project detail.
  const origin = readEditOrigin()
  const back = origin ? originBack(origin).href : `#/proyectos/${id}`

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const goBack = () => {
    window.location.hash = back
  }

  return (
    <div className="mx-auto w-[94%] max-w-3xl">
      <nav aria-label={t('back')} className="pb-4">
        <BackLink href={back}>{origin ? originBack(origin).label : t('title')}</BackLink>
      </nav>
      <PageHeader title={t('edit')} />
      <ProjectEditor id={id} onSaved={goBack} onCancel={goBack} />
    </div>
  )
}

import {guardAdmin} from '@/app/actions/auth'
import MetadataBulkManager from '@/app/components/admin/MetadataBulkManager'
export default async function TranslationsPage(){await guardAdmin();return <MetadataBulkManager/>}

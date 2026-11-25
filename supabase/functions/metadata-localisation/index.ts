import {handleMetadataTranslation} from '../transcript-library/metadata-translation.ts'
// No translation provider keys are read. This endpoint retires paid generation.
Deno.serve(request=>handleMetadataTranslation(request,{
 serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}))

import {defineConfig} from 'vitest/config'
import path from 'node:path'
export default defineConfig({resolve:{alias:{'@':path.resolve(import.meta.dirname)}},test:{environment:'node',include:['benchmarks/learn-loaders.profile.ts'],maxWorkers:1,testTimeout:90000}})

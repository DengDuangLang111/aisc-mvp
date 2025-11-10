import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `
    console.log('\n=== Documents table columns (final) ===')
    columns.forEach(col => console.log('  -', col.column_name))
    console.log('=======================================\n')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

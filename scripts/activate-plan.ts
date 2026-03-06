import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'vpalmezoni@gmail.com' },
    select: { tenantId: true }
  })

  if (!user?.tenantId) {
    console.log('User or tenant not found')
    return
  }

  const updated = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      plano: 'pro',
      planStatus: 'ACTIVE',
    },
    select: { id: true, planStatus: true, plano: true }
  })

  console.log('✅ Plan activated:', updated)
}

main().catch(console.error).finally(() => prisma.$disconnect())

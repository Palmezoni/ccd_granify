import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'vpalmezoni@gmail.com' },
    select: { id: true, tenantId: true, email: true, name: true }
  })
  
  if (!user) {
    console.log('User not found')
    return
  }
  
  console.log('Found user:', user.email, 'tenantId:', user.tenantId)
  
  if (!user.tenantId) {
    console.log('User has no tenantId')
    return
  }
  
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  const updated = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { trialEndsAt: yesterday },
    select: { id: true, planStatus: true, trialEndsAt: true }
  })
  
  console.log('Updated tenant:', updated)
}

main().catch(console.error).finally(() => prisma.$disconnect())

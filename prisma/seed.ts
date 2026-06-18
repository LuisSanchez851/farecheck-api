import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.plataforma.createMany({
    data: [
      { nombre: 'DiDi',         package_android: 'com.didiglobal.passenger',  bundle_ios: 'com.didiglobal.DiDiPassenger', activa: true },
      { nombre: 'Uber',         package_android: 'com.ubercab.driver',         bundle_ios: 'com.ubercab.UberDriver',        activa: true },
      { nombre: 'Picap',        package_android: 'com.picap.android',          bundle_ios: 'com.picap.ios',                 activa: true },
      { nombre: 'Yango',        package_android: 'ru.yandex.taximeter',        bundle_ios: 'ru.yandex.taximeter',           activa: true },
      { nombre: 'InDrive',      package_android: 'sinet.startup.inDriver',     bundle_ios: 'com.indrive.app',               activa: true },
      { nombre: 'Taxis Libres', package_android: 'com.taxislibres.driver',     bundle_ios: 'com.taxislibres.driver',        activa: true },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Plataformas sembradas correctamente.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { Amiri } from 'next/font/google';

/**
 * Muka taip Arab, dimuatkan hanya untuk halaman ini.
 *
 * Subset Arab ialah antara fail fon terbesar dalam aplikasi, dan hanya zikir
 * di sini memerlukannya — memuatkannya dalam susun atur akar bermakna setiap
 * laluan membayar untuknya.
 */
export const amiri = Amiri({
  variable: '--font-amiri',
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
});

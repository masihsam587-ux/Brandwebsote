import test from 'node:test';
import assert from 'node:assert/strict';
import type { Category, Product } from '../api/types';
import { deriveActiveCategoryCards } from './catalogCategories';

const CATEGORIES: Category[] = [
  {
    id: 'cat-jackets',
    name: 'Jackets',
    slug: 'jackets',
    description: 'Fake seed description',
    image: '/src/assets/images/fake-seed-jacket.jpg',
  },
  {
    id: 'cat-hoodies',
    name: 'Hoodies',
    slug: 'hoodies',
    description: 'Fake seed hoodie description',
    image: '/src/assets/images/fake-seed-hoodie.jpg',
  },
  {
    id: 'cat-empty',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Empty category',
    image: '/src/assets/images/fake-seed-watch.jpg',
  },
];

test('deriveActiveCategoryCards returns empty array when no real products are listed', () => {
  assert.deepEqual(deriveActiveCategoryCards(CATEGORIES, []), []);
});

test('deriveActiveCategoryCards excludes empty categories and uses real product coverImage instead of seed category image', () => {
  const products: Product[] = [
    {
      id: 'real-1',
      slug: 'real-peshawari-jacket',
      title: 'Original Peshawari Wool Jacket',
      description: 'Real uploaded jacket',
      price: 8900,
      categoryId: 'cat-jackets',
      categoryName: 'Jackets',
      coverImage: 'https://cdn.example.com/my-real-jacket.jpg',
      extraImages: [],
      sizes: ['M', 'L'],
      inStock: true,
      featured: true,
      createdAt: '2026-11-23T00:00:00.000Z',
    },
    {
      id: 'real-2',
      slug: 'real-jacket-2',
      title: 'Second Jacket',
      description: 'Another jacket',
      price: 7500,
      categoryId: 'cat-jackets',
      categoryName: 'Jackets',
      coverImage: 'https://cdn.example.com/second-jacket.jpg',
      extraImages: [],
      sizes: ['L'],
      inStock: true,
      featured: true,
      createdAt: '2026-11-22T00:00:00.000Z',
    },
  ];

  const cards = deriveActiveCategoryCards(CATEGORIES, products);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].id, 'cat-jackets');
  assert.equal(cards[0].name, 'Jackets');
  assert.equal(cards[0].image, 'https://cdn.example.com/my-real-jacket.jpg');
  assert.notEqual(cards[0].image, '/src/assets/images/fake-seed-jacket.jpg');
  assert.equal(cards[0].productCount, 2);
  assert.equal(cards[0].latestProductTitle, 'Original Peshawari Wool Jacket');
});

test('deriveActiveCategoryCards supports matching by categoryName or unseeded product category', () => {
  const products: Product[] = [
    {
      id: 'real-3',
      slug: 'custom-hoodie',
      title: 'Custom Fleece Hoodie',
      description: 'Real hoodie',
      price: 4200,
      categoryId: 'uuid-from-db',
      categoryName: 'Hoodies',
      coverImage: 'https://cdn.example.com/real-hoodie.jpg',
      extraImages: [],
      sizes: ['M'],
      inStock: true,
      featured: true,
      createdAt: '2026-11-23T00:00:00.000Z',
    },
    {
      id: 'real-4',
      slug: 'custom-shawl',
      title: 'Swat Wool Shawl',
      description: 'Real shawl',
      price: 5500,
      categoryId: 'cat-shawls',
      categoryName: 'Shawls',
      coverImage: 'https://cdn.example.com/real-shawl.jpg',
      extraImages: [],
      sizes: ['One Size'],
      inStock: true,
      featured: true,
      createdAt: '2026-11-23T00:00:00.000Z',
    },
  ];

  const cards = deriveActiveCategoryCards(CATEGORIES, products);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].id, 'cat-hoodies');
  assert.equal(cards[0].image, 'https://cdn.example.com/real-hoodie.jpg');
  assert.equal(cards[1].id, 'cat-shawls');
  assert.equal(cards[1].name, 'Shawls');
  assert.equal(cards[1].image, 'https://cdn.example.com/real-shawl.jpg');
});

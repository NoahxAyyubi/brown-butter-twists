import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const items = [
  {
    name: 'Lotus Biscoff',
    priceCents: 650,
    description: 'A real Brown Butter Twists menu item. Ingredients can be added later.',
    imageUrl: 'https://scontent-lga3-3.cdninstagram.com/v/t51.82787-15/514909423_17924442393067422_8279076486715954820_n.jpg?stp=dst-jpegr_e35_s1080x1080_tt6&_nc_cat=104&ig_cache_key=MzY2ODE2MjYwOTQzNTU2NjA0NA%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkZFRUQueHBpZHMuMTQ0MC5oZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=l3vzo2D4gYAQ7kNvwFWOR6i&_nc_oc=AdrbtEtocoQ01DW0a-1XmLjdlt6hF8EVCXN6iKyLojbRL35vnbV9OxbUS6qEOYYUZs4&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-lga3-3.cdninstagram.com&_nc_gid=_o0Mx4GOY43OFNiLclsvRg&_nc_ss=7a22e&oh=00_Af6pZSJfuDK3QMF0x5ugSNCEetr6MPAQjZJ9jWg9hS4FRg&oe=6A19A36F',
    available: true
  },
  {
    name: 'Grape Leaves',
    priceCents: 2200,
    description: 'A real Brown Butter Twists menu item. Ingredients can be added later.',
    imageUrl: 'https://scontent-lga3-3.cdninstagram.com/v/t51.82787-15/515094253_17924442267067422_3809219049183209983_n.jpg?stp=dst-jpegr_e35_s1080x1080_tt6&_nc_cat=108&ig_cache_key=MzY2ODE2MTA0MTQ1MzU1NDc0OQ%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6IkZFRUQueHBpZHMuMTQ0MC5oZHIucmVndWxhcl9waG90by5DMyJ9&_nc_ohc=PrLHjKrE6g8Q7kNvwFuThSr&_nc_oc=AdqYDWqFE0C_SEwT_tPPnxF5Z1kDPbkpNf15KJ14w3e0EhsB4rphsVLgfqGDnOKwcL8&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-lga3-3.cdninstagram.com&_nc_gid=_o0Mx4GOY43OFNiLclsvRg&_nc_ss=7a22e&oh=00_Af7gfmjkI08_oIsrzmO8uKCqe6CZAYjR_SYq6GE8HhTgQA&oe=6A1999E8',
    available: true
  }
];

await prisma.menuItem.deleteMany({
  where: {
    name: {
      in: [
        'Chocolate Chip Cookies',
        'Brown Butter Cinnamon Twists',
        'Strawberry Cream Buns',
        'Lemon Shortbread Box'
      ]
    }
  }
});

for (const item of items) {
  await prisma.menuItem.upsert({
    where: { name: item.name },
    update: item,
    create: item
  });
}

await prisma.$disconnect();

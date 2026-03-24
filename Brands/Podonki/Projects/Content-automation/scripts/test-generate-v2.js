import PostGeneratorV2 from '../src/generators/post-generator-v2.js';

async function main() {
  try {
    console.log('🔧 Initializing Post Generator V2...\n');
    const generator = new PostGeneratorV2();

    // Test 1: Generate a single B2C post
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Test 1: Single B2C post (fruity flavors)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const singlePost = await generator.generatePost('b2c', 'taste_review', 'фруктовые вкусы');
    console.log(singlePost.post);

    if (singlePost.products.length > 0) {
      console.log('\n📦 Found products:');
      singlePost.products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (match: ${(p.score * 100).toFixed(0)}%)`);
      });
    }

    // Test 2: Generate a B2B post
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Test 2: B2B post (new product announcement)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const b2bPost = await generator.generatePost('b2b', 'product_announcement', 'Swedish Collection');
    console.log(b2bPost.post);

    if (b2bPost.products.length > 0) {
      console.log('\n📦 Found products:');
      b2bPost.products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}`);
      });
    }

    // Test 3: Product search
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Test 3: Product search examples');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const searches = [
      'компактный формат',
      'максимальная крепость',
      'мятные вкусы',
      'бюджетный вариант'
    ];

    for (const query of searches) {
      const results = await generator.searchProducts(query, 2);
      console.log(`Search: "${query}"`);
      results.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}`);
      });
      console.log();
    }

    console.log('✨ All tests completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

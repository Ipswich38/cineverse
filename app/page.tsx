import { supabase } from '@/lib/supabase'
import ProductCard from '@/components/product-card'
import type { Product } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">All Products</h1>
        <p className="text-gray-500 mt-1">Free shipping on orders over ₱1,500</p>
      </div>

      {!products || products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          No products available yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {(products as Product[]).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

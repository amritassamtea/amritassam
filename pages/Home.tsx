import React from 'react';
import { useStore } from '../services/store';
import { ChevronRight, ShieldCheck, Truck, Users, Star, Quote } from 'lucide-react';

export const Home = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { reviews, brandAssets } = useStore();
  
  // Get top 3 positive reviews
  const topReviews = reviews.filter(r => r.rating >= 4).slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-tea-dark text-white relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('${brandAssets.heroImage}')` }}
        ></div>
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10 text-center md:text-left">
          <div className="md:w-2/3">
            <span className="inline-block bg-tea-gold text-tea-dark font-bold px-3 py-1 rounded-full text-sm mb-4">
              Premium Export Quality
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Assam Ki <span className="text-tea-gold">Asli Amrit</span> Chai
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl">
              Strong color, Kadak taste. Sourced directly from upper Assam gardens for the perfect cup of Indian Chai. Ideal for home, hotels, and tapris.
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => onNavigate('SHOP')}
                className="bg-tea-red hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition shadow-lg flex items-center justify-center gap-2"
              >
                Order Online <ChevronRight size={20} />
              </button>
              <button 
                onClick={() => onNavigate('DISTRIBUTOR_INFO')}
                className="bg-transparent border-2 border-white hover:bg-white/10 text-white font-bold py-3 px-8 rounded-lg text-lg transition flex items-center justify-center"
              >
                Join as Distributor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="w-16 h-16 bg-tea-green/10 text-tea-green rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-tea-dark">100% Shuddh Assam CTC</h3>
              <p className="text-gray-600">Pure, unblended tea grains ensuring consistent taste and strength in every packet.</p>
            </div>
            <div className="p-6 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="w-16 h-16 bg-tea-gold/10 text-tea-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-tea-dark">Trusted by 1000+ Kiranas</h3>
              <p className="text-gray-600">Our massive distribution network across Mumbai APMC ensures fresh stock availability.</p>
            </div>
            <div className="p-6 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition">
              <div className="w-16 h-16 bg-tea-red/10 text-tea-red rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-tea-dark">Fast Pan-India Delivery</h3>
              <p className="text-gray-600">Secure packaging and reliable logistics partners for safe delivery to your doorstep.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-stone-100">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <img 
              src={brandAssets.featureImage} 
              alt="Tea making" 
              className="rounded-2xl shadow-xl w-full h-auto object-cover"
            />
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold text-tea-dark mb-6">Perfect for Tapri, Kirana & Home</h2>
            <ul className="space-y-4">
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-tea-green text-white rounded-full flex items-center justify-center text-xs">✓</span>
                <span className="text-gray-700 font-medium">Dark red colour in seconds</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-tea-green text-white rounded-full flex items-center justify-center text-xs">✓</span>
                <span className="text-gray-700 font-medium">Strong flavour (Kadak) - less powder needed</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-tea-green text-white rounded-full flex items-center justify-center text-xs">✓</span>
                <span className="text-gray-700 font-medium">Sealed 3-layer packaging for freshness</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-6 h-6 bg-tea-green text-white rounded-full flex items-center justify-center text-xs">✓</span>
                <span className="text-gray-700 font-medium">Attractive margin for distributors</span>
              </li>
            </ul>
            <button 
              onClick={() => onNavigate('SHOP')}
              className="mt-8 bg-tea-dark text-white font-bold py-3 px-8 rounded hover:bg-gray-900 transition"
            >
              Shop Products
            </button>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="py-16 bg-white">
         <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-tea-dark mb-12">What Our Customers Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {topReviews.length > 0 ? (
                 topReviews.map(review => (
                    <div key={review.id} className="bg-stone-50 p-6 rounded-xl relative shadow-sm hover:shadow-md transition">
                       <Quote className="text-tea-gold/30 absolute top-4 right-4" size={48} />
                       <div className="flex gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                             <Star key={i} size={16} className={i < review.rating ? "text-tea-gold fill-tea-gold" : "text-gray-300"} />
                          ))}
                       </div>
                       <p className="text-gray-600 mb-6 italic">{review.comment}</p>
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-tea-dark rounded-full flex items-center justify-center text-white font-bold text-sm">
                             {review.userName.charAt(0)}
                          </div>
                          <div>
                             <h4 className="font-bold text-sm text-gray-900">{review.userName}</h4>
                             <p className="text-xs text-gray-500">Verified Buyer</p>
                          </div>
                       </div>
                    </div>
                 ))
               ) : (
                 <div className="text-center col-span-3 text-gray-500">No reviews yet. Be the first to review!</div>
               )}
            </div>
         </div>
      </section>
    </div>
  );
};
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Product, Review } from '../types';
import { Star, X, Send } from 'lucide-react';

export const ReviewModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
  const { reviews, addReview, user } = useStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const productReviews = reviews.filter(r => r.productId === product.id);
  const avgRating = productReviews.length > 0 
      ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
      : '0';

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) {
          alert('Please login to submit a review');
          return;
      }
      if (!comment.trim()) {
          alert('Please write a comment');
          return;
      }
      const newReview: Review = {
          id: `r-${Date.now()}`,
          productId: product.id,
          userId: user.id,
          userName: user.name,
          rating,
          comment,
          date: new Date().toISOString().split('T')[0]
      };
      addReview(newReview);
      setComment('');
      setRating(5);
  };

  return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                  <div>
                      <h3 className="font-bold text-lg">{product.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                         <span className="font-bold text-tea-dark flex items-center gap-1">
                             {avgRating} <Star size={12} className="fill-tea-gold text-tea-gold"/>
                         </span>
                         <span>({productReviews.length} reviews)</span>
                      </div>
                  </div>
                  <button onClick={onClose}><X size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Reviews List */}
                  {productReviews.length > 0 ? (
                      <div className="space-y-4">
                          {productReviews.map(review => (
                              <div key={review.id} className="border-b pb-4 last:border-0">
                                  <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 bg-tea-green/20 text-tea-dark rounded-full flex items-center justify-center text-xs font-bold">
                                              {review.userName.charAt(0)}
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold">{review.userName}</p>
                                              <div className="flex text-tea-gold">
                                                  {[...Array(5)].map((_, i) => (
                                                      <Star key={i} size={10} className={i < review.rating ? "fill-tea-gold" : "text-gray-300"} />
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                      <span className="text-xs text-gray-400">{review.date}</span>
                                  </div>
                                  <p className="text-sm text-gray-700">{review.comment}</p>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-gray-500">No reviews yet. Be the first to review!</div>
                  )}
              </div>

              {/* Add Review Form */}
              <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                  {user ? (
                      <form onSubmit={handleSubmit}>
                          <h4 className="font-bold text-sm mb-3">Write a Review</h4>
                          <div className="flex gap-1 mb-3">
                              {[1, 2, 3, 4, 5].map((star) => (
                                  <button type="button" key={star} onClick={() => setRating(star)}>
                                      <Star 
                                          size={24} 
                                          className={star <= rating ? "fill-tea-gold text-tea-gold" : "text-gray-300"} 
                                      />
                                  </button>
                              ))}
                          </div>
                          <div className="flex gap-2">
                              <input 
                                  className="flex-1 border p-2 rounded text-sm"
                                  placeholder="Share your experience..."
                                  value={comment}
                                  onChange={e => setComment(e.target.value)}
                              />
                              <button type="submit" className="bg-tea-dark text-white p-2 rounded hover:bg-black">
                                  <Send size={18} />
                              </button>
                          </div>
                      </form>
                  ) : (
                      <div className="text-center">
                          <p className="text-sm text-gray-500 mb-2">Please login to write a review</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );
};
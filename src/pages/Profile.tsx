import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { User as UserIcon, Mail, Calendar, LogOut, Save, Loader2, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Profile() {
  const { user, logOut, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || user.displayName || '');
          setPhotoURL(data.photoURL || user.photoURL || '');
          if (data.createdAt) {
            setCreatedAt(data.createdAt.toDate());
          }
        }
      } catch (error) {
        console.error("Error fetching profile", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.8);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      // Resize image to make it faster and save space
      const resizedBlob = await resizeImage(file);
      
      // Use a unique filename to avoid browser cache issues
      const timestamp = Date.now();
      const storageRef = ref(storage, `users/${user.uid}/profile_${timestamp}.jpg`);
      
      await uploadBytes(storageRef, resizedBlob);
      const url = await getDownloadURL(storageRef);
      
      // Update Auth
      await updateProfile(user, { photoURL: url });
      
      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: url
      });
      
      await refreshUser();
      setPhotoURL(url);
      setMessage({ type: 'success', text: 'Photo de profil mise à jour !' });
    } catch (error) {
      console.error("Error uploading photo", error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'envoi de la photo.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Update Firebase Auth
      await updateProfile(user, { displayName });
      
      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName
      });
      
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-500 mt-1">Gère tes informations personnelles et tes paramètres.</p>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 text-center sm:text-left">
            <div className="relative group">
              <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold overflow-hidden shrink-0">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  displayName.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{displayName || 'Élève'}</h2>
              <p className="text-gray-500 flex items-center justify-center sm:justify-start gap-2 mt-2">
                <Mail size={16} />
                {user?.email}
              </p>
              {createdAt && (
                <p className="text-gray-500 flex items-center justify-center sm:justify-start gap-2 mt-1 text-sm">
                  <Calendar size={16} />
                  Membre depuis le {format(createdAt, 'dd MMMM yyyy', { locale: fr })}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {message.text && (
              <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom d'affichage</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="Ton nom"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-8 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
        
        <div className="bg-gray-50 p-8 border-t border-gray-100">
          <h3 className="text-lg font-bold text-red-600 mb-2">Zone de danger</h3>
          <p className="text-gray-500 text-sm mb-6">
            Déconnecte-toi de ton compte sur cet appareil. Tes données resteront sauvegardées et synchronisées.
          </p>
          <button
            onClick={logOut}
            className="w-full sm:w-auto px-6 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            Me déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

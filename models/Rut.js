import mongoose from 'mongoose';

const rutSchema = new mongoose.Schema({
  rut: { type: String, unique: true, required: true },
  dv: {type: String, required: true},
  nombre: String,
  demandas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Demanda' }],
});

export default mongoose.models.Rut || mongoose.model('Rut', rutSchema);

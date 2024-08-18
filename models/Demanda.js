import mongoose from 'mongoose';

const demandaSchema = new mongoose.Schema({
  rol: { type: String, required: true },
  tribunal: { type: String, required: true },
  detalles: Object,
  idUnico: { type: String, unique: true, required: true },
});

export default mongoose.models.Demanda || mongoose.model('Demanda', demandaSchema);

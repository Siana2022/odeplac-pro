// Función para buscar el material más parecido en tu lista de 504
export function buscarMaterialEnInventario(palabrasClave: string, inventario: any[]) {
    const palabras = palabrasClave.toLowerCase().split(" ");
    
    // Filtramos el inventario buscando materiales que contengan todas las palabras clave
    const candidatos = inventario.filter(mat => {
      const nombre = mat.nombre.toLowerCase();
      return palabras.every(p => nombre.includes(p));
    });
  
    // Devolvemos el primero que encuentre o null
    return candidatos.length > 0 ? candidatos[0] : null;
  }
  
  // Estructura de un "Presupuesto Borrador"
  export interface LineaPresupuesto {
    partida: string;
    descripcion: string;
    cantidadM2: number;
    materiales: {
      nombre: string;
      cantidadCalculada: number;
      precioUnitario: number;
      subtotal: number;
    }[];
  }
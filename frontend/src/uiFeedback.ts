import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
const dialog=Swal.mixin({heightAuto:false,scrollbarPadding:false,background:'#153b35',color:'#eef7ee',buttonsStyling:false,confirmButtonText:'Entendido',cancelButtonText:'Cancelar',customClass:{container:'silvana-feedback',popup:'silvana-popup',title:'silvana-popup-title',htmlContainer:'silvana-popup-copy',confirmButton:'silvana-confirm',cancelButton:'silvana-cancel',actions:'silvana-popup-actions'},showClass:{popup:'silvana-popup-enter'},hideClass:{popup:'silvana-popup-leave'}});
export async function confirmAction(title:string,text:string,confirmButtonText='Confirmar'){
 if(Swal.isVisible()&&!Swal.getPopup()?.classList.contains('swal2-toast'))return false;
 const result=await dialog.fire({title,text,icon:'question',iconColor:'#b6ecd0',showCancelButton:true,confirmButtonText,focusCancel:true,allowOutsideClick:false});return result.isConfirmed;
}
export function notifySuccess(title:string){void dialog.fire({toast:true,backdrop:false,position:'top-end',showClass:{popup:'silvana-toast-enter',backdrop:'',icon:''},hideClass:{popup:'silvana-toast-leave',backdrop:'',icon:''},title,icon:'success',iconColor:'#b6ecd0',showConfirmButton:false,timer:3200,timerProgressBar:true,customClass:{container:'silvana-feedback silvana-toast-container',popup:'silvana-popup silvana-toast',title:'silvana-popup-title'},didOpen:popup=>{popup.addEventListener('mouseenter',Swal.stopTimer);popup.addEventListener('mouseleave',Swal.resumeTimer);}});}
export function notifyError(text:string){void dialog.fire({title:'No se pudo completar',text,icon:'error',iconColor:'#e8b9a7'});}

export default function Head() {
  return (
    <>
      <meta name="dom-guard" content="1" />
      <script
        id="dom-guard"
        // Runs as the parser hits it, before React hydration.
        dangerouslySetInnerHTML={{
          __html: `(function(){try{window.__DOM_GUARD_INSTALLED__=true;function patch(proto){if(!proto)return;var a=proto.appendChild;var r=proto.removeChild;if(!a||!r)return;proto.appendChild=function(c){try{if(this===document&&document.body&&c){return a.call(document.body,c);} }catch(e){}return a.call(this,c);};proto.removeChild=function(c){try{return r.call(this,c);}catch(e){try{if(this&&c&&c.parentNode===this){return r.call(this,c);} }catch(e2){}return c;}};}patch(Node&&Node.prototype);patch(typeof Document!=='undefined'&&Document.prototype);patch(typeof HTMLDocument!=='undefined'&&HTMLDocument.prototype);}catch(e){}})();`,
        }}
      />
    </>
  );
}

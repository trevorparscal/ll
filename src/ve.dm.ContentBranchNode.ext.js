/*!
 * LL two-way parallel translation - ve.dm.ContentBranchNode extensions
 *
 * @copyright 2019 LL team and others; see LICENSE.txt for terms
 */

/**
 * Get the text for this node of the last approved correspondence
 *
 * @return {ll.ChunkedText} Text for this node of the last approved correspondence
 */
ve.dm.ContentBranchNode.prototype.getLastApproved = function () {
	if ( this.lastApproved ) {
		return this.lastApproved[ this.getDocument().getLang() ];
	}
	return new ll.ChunkedText( '', [], [] );
};

/**
 * Set the last approved correspondence for this node
 *
 * This same (reference-equal) object must be set on the other document's paired node
 *
 * @param {Object} lastApproved Last approved correspondence, keyed on lang code
 * @param {ll.ChunkedText} lastApproved.lang1 Text in lang1 for last approved correspondence
 * @param {ll.ChunkedText} lastApproved.lang2 Text in lang2 for last approved correspondence
 */
ve.dm.ContentBranchNode.prototype.setLastApprovedPair = function ( lastApproved ) {
	this.lastApproved = lastApproved;
};

/**
 * Get the annotated content, chunked at annotation changes
 *
 * @return {ll.ChunkedText} Annotated chunked content
 */
ve.dm.ContentBranchNode.prototype.getChunked = function () {
	var i, len, item, annList, ch, annListStr, commonAnnList, commonAnnListLen, chunks, start,
		texts = [],
		annLists = [],
		chars = [],
		lastAnnList = null,
		lastAnnListStr = null,
		data = this.getDocument().getDataFromNode( this );

	function flush() {
		if ( chars.length === 0 ) {
			return;
		}
		texts.push( chars.join( '' ) );
		annLists.push( lastAnnList );
		chars.length = 0;
	}
	for ( i = 0, len = data.length; i < len; i++ ) {
		item = data[ i ];
		annList = Array.isArray( item ) ? item[ 1 ] : [];
		ch = Array.isArray( item ) ? item[ 0 ] : item;
		annListStr = JSON.stringify( annList );
		if ( lastAnnListStr !== annListStr ) {
			// Annotation change: flush chunk
			if ( chars.length > 0 ) {
				flush();
				lastAnnList = annList;
				lastAnnListStr = annListStr;
			}
		}
		chars.push( ch );
		lastAnnList = annList;
		lastAnnListStr = annListStr;
	}
	if ( chars.length > 0 ) {
		flush();
	}
	if ( texts.length === 0 ) {
		return new ll.ChunkedText( '', [], [] );
	}
	commonAnnListLen = ve.getCommonStartSequenceLength( annLists );
	commonAnnList = annLists.length === 0 ?
		[] :
		annLists[ 0 ].slice(
			0,
			ve.getCommonStartSequenceLength( annLists )
		);
	chunks = [];
	start = 0;
	for ( i = 0, len = texts.length; i < len; i++ ) {
		// TODO: kill extraneous whitespace inside chunks
		if ( annLists[ i ].length > commonAnnListLen ) {
			chunks.push( {
				start: start,
				text: texts[ i ],
				annList: annLists[ i ]
			} );
		}
		start += texts[ i ].length;
	}
	return new ll.ChunkedText(
		texts.join( '' ),
		commonAnnList,
		chunks
	);
};

/**
 * Update the DOM to reflect the model's ll-dirty attribute state
 */
ve.ce.ContentBranchNode.prototype.updateLLDirtyState = function () {
	var state = this.model.getAttribute( 'll-dirty' );
	// Values can be 'mt', 'edited', 'approved' or undefined
	this.$element.toggleClass(
		've-ce-contentBranchNode-ll-dirty',
		state === 'edited' || state === 'mt'
	);
};

/**
 * Handle model attributeChange event
 *
 * @param {string} key Attribute name
 */
ve.ce.ContentBranchNode.prototype.onModelAttributeChange = function ( key ) {
	if ( key === 'll-dirty' ) {
		this.updateLLDirtyState();
	}
};

// HACK: In-place override of ve.ce.ContentBranchNode#onSetup
( function () {
	var base = ve.ce.ContentBranchNode.prototype.onSetup;
	ve.ce.ContentBranchNode.prototype.onSetup = function () {
		base.apply( this, arguments );
		if ( !this.modelAttributeChangeListener ) {
			this.modelAttributeChangeListener = true;
			this.model.connect( this, {
				attributeChange: 'onModelAttributeChange'
			} );
		}
		this.updateLLDirtyState();
	};
}() );

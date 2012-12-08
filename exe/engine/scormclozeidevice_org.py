# ===========================================================================
# eXe 
# Copyright 2004-2006, University of Auckland
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
# ===========================================================================

"""
Cloze Idevice. Shows a paragraph where the student must fill in the blanks
"""

import logging
from exe.engine.idevice import Idevice
from exe.engine.field   import FieldWithResources, TextAreaField
from exe.engine.persist import Persistable
import Image
from exe.engine.path      import Path, toUnicode
from exe.engine.resource  import Resource
from exe.engine.translate import lateTranslate
from exe.engine.mimetex   import compile
from HTMLParser           import HTMLParser
from exe.engine.flvreader import FLVReader
from htmlentitydefs       import name2codepoint
from exe.engine.htmlToText import HtmlToText
from twisted.persisted.styles import Versioned
from exe                  import globals as G

import os
import re
import urllib
import shutil

log = logging.getLogger(__name__)

# ===========================================================================
class ScormClozeIdevice(Idevice):
    """
    Holds a paragraph with words missing that the student must fill in
    """
    
    persistenceVersion = 4

    def __init__(self, parentNode=None):
        """
        Sets up the idevice title and instructions etc
        """
        Idevice.__init__(self, x_(u"SCORM Test L�cke"),
                         x_(u"University of Auckland"), 
                         x_(u"<p>Cloze exercises are texts or "
                             "sentences where students must fill in "
                             "missing words. They are often used for the "
                             "following purposes:</p>"
                             "<ol>"
                             "<li>To check knowledge of core course "
                             "concepts (this could be a pre-check, "
                             "formative exercise, or summative check).</li>"
                             "<li>To check reading comprehension.</li>"
                             "<li>To check vocabulary knowledge.</li>"
                             "<li>To check word formation and/or grammatical "
                             "competence. </li></ol>"),
                         x_(u"<dl>"
                             "  <dt>If your goal is to test understanding "
                             "of core concepts or reading comprehension"
                             "  </dt>"
                             "  <dd>"
                             "    <p>"
                             "  Write a summary of the concept or reading long "
                             " enough to adequately test the target's "
                             "knowledge, but short enough not to "
                             "induce fatigue. Less than one typed page is "
                             "probably adequate, but probably "
                             "considerably less for young students or "
                             "beginners."
                             "    </p>"
                             "    <p>"
                             "Select words in the text that"
                             "are key to understanding the concepts. These"
                             "will probably be verbs, nouns, and key adverbs."
                             "Choose alternatives with one clear answer."
                             "    </p>"
                             "  </dd>"
                             "  <dt>"
                             "If your goal is to test vocabulary knowledge"
                             "  </dt>"
                             "  <dd>"
                             "<p>Write a text using the target vocabulary. This "
                             "text should be coherent and cohesive, and be of "
                             "an appropriate length. Highlight the target "
                             "words in the text. Choose alternatives with one "
                             "clear answer.</p>"
                             "  </dd>"
                             "  <dt>"
                             "If your goal is to test word "
                             "formation/grammar:"
                             "  </dt>"
                             "  <dd>"
                             "  <p>"
                             "Write a text using the "
                             "target forms. This text should be coherent and "
                             "cohesive, and be of an appropriate length. "
                             "Remember that the goal is not vocabulary "
                             "knowledge, so the core meanings of the stem "
                             "words should be well known to the students."
                             "  </p>"
                             "  <p>"
                             "Highlight the target words in the text. Provide "
                             "alternatives with the same word stem, but "
                             "different affixes. It is a good idea to get a "
                             "colleague to test the test/exercise to make "
                             "sure there are no surprises!"
                             "  </p>"
                             "  </dd>"
                             "</dl>"),
                            u"question",
                             parentNode)
        self.instructionsForLearners = TextAreaField(
            x_(u'Instructions'),
            x_(u"""Provide instruction on how the cloze activity should be 
completed. Default text will be entered if there are no changes to this field.
"""),
            x_(u'Trage die richtigen Antworten ein!'))
        self.instructionsForLearners.idevice = self
        self._content = ScormClozeField(x_(u'Cloze'), 
            x_(u"""<p>Tragen Sie den Text f�r die L&uuml;cken&uuml;bung in das Eingabefenster ein.
               Wenn Sie Text aus einer anderen Datei kopieren, f&uuml;gen Sie ihn <b>unbedingt</b>
               mittels des Buttons <b>'Paste as plain Text'</b> ein.</p><p>\n
               Markieren Sie die zu verbergenden W&ouml;rter und klicken Sie anschlie&szlig;end auf den
               Button <i>Wort verbergen/anzeigen'</i>.<br> Hinweise:<br>In Antworten k&ouml;nnen 
               Leerzeichen enthalten sein.<br>M&ouml;chten Sie die Antwortm&ouml;glichkeiten den
               Lernenden anzeigen, so sortieren Sie die Antwortm&ouml;glichkeiten am besten 
               alphabetisch und schreiben Sie sie an den Anfang oder an das Ende des L&uuml;ckentextes.</p>"""))
        self._content.idevice = self
        self.feedback = TextAreaField(x_(u'Feedback'),
            x_(u'Enter any feedback you wish to provide the learner '
                'with-in the feedback field. This field can be left blank.'))
        self.feedback.idevice = self
        self.emphasis = Idevice.SomeEmphasis
        self.systemResources += ["common.js"]
        self.isCloze = True


    # Properties
    content = property(lambda self: self._content, 
                       doc="Read only, use 'self.content.encodedContent = x' "
                           "instead")

    def getResourcesField(self, this_resource): 
        """ 
        implement the specific resource finding mechanism for this iDevice: 
        """ 
        # be warned that before upgrading, this iDevice field could not exist:
        if hasattr(self, '_content') and hasattr(self._content, 'images'):
            for this_image in self._content.images: 
                if hasattr(this_image, '_imageResource') \
                and this_resource == this_image._imageResource: 
                    return self._content

        # be warned that before upgrading, this iDevice field could not exist:
        if hasattr(self, 'instructionsForLearners')\
        and hasattr(self.instructionsForLearners, 'images'):
            for this_image in self.instructionsForLearners.images: 
                if hasattr(this_image, '_imageResource') \
                and this_resource == this_image._imageResource: 
                    return self.instructionsForLearners

        # be warned that before upgrading, this iDevice field could not exist:
        if hasattr(self, 'feedback') and hasattr(self.feedback, 'images'):
            for this_image in self.feedback.images: 
                if hasattr(this_image, '_imageResource') \
                and this_resource == this_image._imageResource: 
                    return self.feedback
        
        return None

      
    def getRichTextFields(self):
        """
        Like getResourcesField(), a general helper to allow nodes to search 
        through all of their fields without having to know the specifics of each
        iDevice type.  
        """
        fields_list = []
        if hasattr(self, '_content'):
            fields_list.append(self._content)
        if hasattr(self, 'instructionsForLearners'):
            fields_list.append(self.instructionsForLearners)
        if hasattr(self, 'feedback'):
            fields_list.append(self.feedback)
        return fields_list
        
    def burstHTML(self, i):
        """
        takes a BeautifulSoup fragment (i) and bursts its contents to 
        import this idevice from a CommonCartridge export
        """
        # Cloze Idevice:
        title = i.find(name='span', attrs={'class' : 'iDeviceTitle' })
        self.title = title.renderContents().decode('utf-8')

        inner = i.find(name='div', attrs={'class' : 'iDevice_inner' })

        instruct = inner.find(name='div', 
                attrs={'class' : 'block' , 'style' : 'display:block' })
        self.instructionsForLearners.content_wo_resourcePaths = \
                instruct.renderContents().decode('utf-8')
        # and add the LOCAL resource paths back in:
        self.instructionsForLearners.content_w_resourcePaths = \
                self.instructionsForLearners.MassageResourceDirsIntoContent( \
                    self.instructionsForLearners.content_wo_resourcePaths)
        self.instructionsForLearners.content = \
                self.instructionsForLearners.content_w_resourcePaths

        content = inner.find(name='div', attrs={'id' : re.compile('^cloze') })
        rebuilt_contents = ""
        for this_content in content.contents:
            if not this_content.__str__().startswith('<input'):
                if this_content.__str__().startswith('<span'):
                    # Now, decode the answer
                    # with code reverse-engineered from:
                    # a) Cloze's getClozeAnswer() in common.js
                    # b) ClozeElement's renderView() + encrypt()
                    answer = ""
                    code_key = 'X'
                    code = this_content.renderContents()
                    code = code.decode('base64')
                    # now in the form %uABCD%uEFGH%uIJKL....
                    char_pos = 0
                    while char_pos < len(code):
                        # first 2 chars = %u, replace with 0x to get int
                        # next 4 = the encoded unichr
                        this_code_char = "0x" + code[char_pos+2 : char_pos+6]
                        this_code_ord = int(this_code_char, 16)
                        letter = chr(ord(code_key)^this_code_ord)
                        answer += letter
                        # key SHOULD be ^'d by letter, but seems to be:
                        code_key = letter
                        char_pos += 6
                    rebuilt_contents += "<U>" + answer + "</U>"
                elif not this_content.__str__().startswith('<div'):
                    # this should be the un-clozed text:
                    rebuilt_contents +=  this_content.__str__()
        self._content.content_wo_resourcePaths = rebuilt_contents
        # and add the LOCAL resource paths back in:
        self._content.content_w_resourcePaths = \
                self._content.MassageResourceDirsIntoContent( \
                    self._content.content_wo_resourcePaths)
        self._content.content = self._content.content_w_resourcePaths

        feedback = inner.find(name='div', attrs={'class' : 'feedback' })
        self.feedback.content_wo_resourcePaths = \
                feedback.renderContents().decode('utf-8')
        # and add the LOCAL resource paths back in:
        self.feedback.content_w_resourcePaths = \
                self.feedback.MassageResourceDirsIntoContent( \
                    self.feedback.content_wo_resourcePaths)
        self.feedback.content = self.feedback.content_w_resourcePaths

        # and each cloze flag field (strict, case, instant):
        flag_strict = inner.find(name='input', 
                attrs={'id' : re.compile('^clozeFlag.*strictMarking$') })
        if flag_strict.attrMap['value']=="true":
            self._content.strictMarking = True
        flag_caps = inner.find(name='input', 
                attrs={'id' : re.compile('^clozeFlag.*checkCaps$') })
        if flag_caps.attrMap['value']=="true":
            self._content.checkCaps = True
        flag_instant = inner.find(name='input', 
                attrs={'id' : re.compile('^clozeFlag.*instantMarking$') })
        if flag_instant.attrMap['value']=="true":
            self._content.instantMarking = True

    def upgradeToVersion1(self):
        """
        Upgrades exe to v0.10
        """
        self._upgradeIdeviceToVersion1()
        self.instructionsForLearners = TextAreaField(
            x_(u'Instructions For Learners'),
            x_(u'Put instructions for learners here'),
            x_(u'Read the paragraph below and '
                'fill in the missing words'))
        self.instructionsForLearners.idevice = self
        self.feedback = TextAreaField(x_(u'Feedback'))
        self.feedback.idevice = self


    def upgradeToVersion2(self):
        """
        Upgrades exe to v0.11
        """
        self.content.autoCompletion = True
        self.content.autoCompletionInstruc =  _(u"Allow auto completion when "
                                                u"user filling the gaps.")

    def upgradeToVersion3(self):
        """
        Upgrades to v0.12
        """
        self._upgradeIdeviceToVersion2()
        self.systemResources += ["common.js"]
        
    def upgradeToVersion4(self):
        """
        Upgrades to v0.20.3
        """
        self.isCloze = True
# ===========================================================================
# ===========================================================================
class ScormClozeField(FieldWithResources):
    """
    This field handles a passage with words that the student must fill in
    And can now support multiple images (and any other resources) via tinyMCE
    """

    regex = re.compile('(%u)((\d|[A-F]){4})', re.UNICODE)
    persistenceVersion = 3

    # these will be recreated in FieldWithResources' TwistedRePersist:
    nonpersistant      = ['content', 'content_wo_resourcePaths']

    def __init__(self, name, instruc):
        """
        Initialise
        """
        FieldWithResources.__init__(self, name, instruc)
        self.parts = []
        self._encodedContent = ''
        self.rawContent = ''
        self._setVersion2Attributes()

    def _setVersion2Attributes(self):
        """
        Sets the attributes that were added in persistenceVersion 2
        """
        self.strictMarking = False
        self._strictMarkingInstruc = \
            x_(u"<p>If left unchecked a small number of spelling and "
                "capitalization errors will be accepted. If checked only "
                "an exact match in spelling and capitalization will be accepted."
                "</p>"
                "<p><strong>For example:</strong> If the correct answer is "
                "<code>Elephant</code> then both <code>elephant</code> and "
                "<code>Eliphant</code> will be judged "
                "<em>\"close enough\"</em> by the algorithm as it only has "
                "one letter wrong, even if \"Check Capitilization\" is on."
                "</p>"
                "<p>If capitalization checking is off in the above example, "
                "the lowercase <code>e</code> will not be considered a "
                "mistake and <code>eliphant</code> will also be accepted."
                "</p>"
                "<p>If both \"Strict Marking\" and \"Check Capitalization\" "
                "are set, the only correct answer is \"Elephant\". If only "
                "\"Strict Marking\" is checked and \"Check Capitalization\" "
                "is not, \"elephant\" will also be accepted."
                "</p>")
        self.checkCaps = False
        self._checkCapsInstruc = \
            x_(u"<p>If this option is checked, submitted answers with "
                "different capitalization will be marked as incorrect."
                "</p>")
        self.instantMarking = False
        self._instantMarkingInstruc = \
            x_(u"""<p>If this option is set, each word will be marked as the
learner types it rather than all the words being marked the end of the
exercise.</p>""")

    # Property handlers
    def set_encodedContent(self, value):
        """
        Cleans out the encoded content as it is passed in. Makes clean XHTML.
        """
        for key, val in name2codepoint.items():
            value = value.replace('&%s;' % key, unichr(val))
        # workaround for Microsoft Word which incorrectly quotes font names
        value = re.sub(r'font-family:\s*"([^"]+)"', r'font-family: \1', value)
        parser = ScormClozeHTMLParser()
        parser.feed(value)
        parser.close()
        self.parts = parser.result
        encodedContent = ''
        for shown, hidden in parser.result:
            encodedContent += shown
            if hidden:
                encodedContent += ' <u>'
                encodedContent += hidden
                encodedContent += '</u> '
        self._encodedContent = encodedContent

    # Properties
    encodedContent        = property(lambda self: self._encodedContent,
                                     set_encodedContent)
    strictMarkingInstruc  = lateTranslate('strictMarkingInstruc')
    checkCapsInstruc      = lateTranslate('checkCapsInstruc')
    instantMarkingInstruc = lateTranslate('instantMarkingInstruc')

    def upgradeToVersion1(self):
        """
        Upgrades to exe v0.11
        """
        self.autoCompletion = True
        self.autoCompletionInstruc = _(u"""Allow auto completion when
                                       user filling the gaps.""")

    def upgradeToVersion2(self):
        """
        Upgrades to exe v0.12
        """
        Field.upgradeToVersion2(self)
        strictMarking = not self.autoCompletion
        del self.autoCompletion
        del self.autoCompletionInstruc
        self._setVersion2Attributes()
        self.strictMarking = strictMarking

    def upgradeToVersion3(self):
        """
        Upgrades to somewhere before version 0.25 (post-v0.24)
        to reflect that ClozeField now inherits from FieldWithResources,
        and will need its corresponding fields populated from content.
        """
        self.content = self.encodedContent
        self.content_w_resourcePaths = self.encodedContent
        self.content_wo_resourcePaths = self.encodedContent
        # NOTE: we don't need to actually process any of those contents for
        # image paths, either, since this is an upgrade from pre-images!

# ===========================================================================
class ScormClozeHTMLParser(HTMLParser):
    """
    Separates out gaps from our raw cloze data
    """

    # Default attribute values
    result = None
    inGap = False
    lastGap = ''
    lastText = ''
    whiteSpaceRe = re.compile(r'\s+')
    paragraphRe = re.compile(r'(\r\n\r\n)([^\r]*)(\1)')

    def reset(self):
        """
        Make our data ready
        """
        HTMLParser.reset(self)
        self.result = []
        self.inGap = False
        self.lastGap = ''
        self.lastText = ''

    def handle_starttag(self, tag, attrs):
        """
        Turn on inGap if necessary
        """
        if not self.inGap:
            if tag.lower() == 'u':
                self.inGap = True
            elif tag.lower() == 'span':
                style = dict(attrs).get('style', '')
                if 'underline' in style:
                    self.inGap = True
                else:
                    self.writeTag(tag, attrs)
            elif tag.lower() == 'br':
                self.lastText += '<br/>'
            else:
                self.writeTag(tag, attrs)

    def writeTag(self, tag, attrs=None):
        """
        Outputs a tag "as is"
        """
        if attrs is None:
            self.lastText += '</%s>' % tag
        else:
            attrs = ['%s="%s"' % (name, val) for name, val in attrs]
            if attrs:
                self.lastText += '<%s %s>' % (tag, ' '.join(attrs))
            else:
                self.lastText += '<%s>' % tag

    def handle_endtag(self, tag):
        """
        Turns off inGap
        """
        if self.inGap:
            if tag.lower() == 'u':
                self.inGap = False
                self._endGap()
            elif tag.lower() == 'span':
                self.inGap = False
                self._endGap()
        elif tag.lower() != 'br':
            self.writeTag(tag)

#changed version ktlm
    def _endGap(self):
        """
        Handles finding the end of gap
        """
        # Tidy up and possibly split the gap
        gapString = self.lastGap.strip()
        lastText = self.lastText
        self.result.append((lastText, gapString))
        self.lastGap = ''
        self.lastText = ''

    def handle_data(self, data):
        """
        Adds the data to either lastGap or lastText
        """
        if self.inGap:
            self.lastGap += data
        else:
            self.lastText += data

    def close(self):
        """
        Fills in the last bit of result
        """
        if self.lastText:
            self._endGap()
            #self.result.append((self.lastText, self.lastGap))
        HTMLParser.close(self)
# ===========================================================================